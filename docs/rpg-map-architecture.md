# RPGマップ拡張基盤

## 目的

既存の広場・会話・操作キャラクター変更・バトル往復を保ちながら、マップ追加、NPC行動、会話表現、イベント演出を段階的に増やせる責務境界を定める。

この文書はPhase 1〜3の実装契約を扱う。Phase 4以降の徘徊・巡回Behaviorや新規マップのコンテンツ制作は対象外とする。

## Phase境界

### Phase 1: content catalog

- map・actor・eventのcatalog型を追加する
- `pixi-map.js`から広場固有のmap・prop・actor asset importを除く
- Tiled actorへ`entityId / eventId / behaviorId`を追加する
- Tiledの`eventId`をevent catalogで解決し、未知参照をロード時に拒否する

完了条件は、初期`WorldState.player.mapId`から任意の登録済みmapをロードでき、広場の見た目と操作が変わらないこと。実行中のmap転送はPhase 5へ送り、Phase 1〜3では公開しない。

### Phase 2: MapRuntime / GameController

- プレイヤー・NPCの現在座標、向き、表示状態、入力ロックを`MapRuntime`へ移す
- 毎フレームの`GameSession.updatePlayer()`を廃止し、checkpoint APIへ置き換える
- 操作キャラクター変更と戦闘要求を`GameController`へ移す
- `window`のmap battle CustomEventを廃止する
- 会話定義とDOMの会話進行はこの時点では残すが、現在位置は`MapRuntime`から読む

完了条件は、広場の移動・会話対象判定・操作変更・戦闘帰還が同じ挙動で動き、移動中に`WorldState`がpublishされないこと。

### Phase 3: EventRunner

- ガイド用の会話テストfixtureと6キャラクターの会話を`EventDefinition`へ移す
- DOMからシナリオ分岐、フラグ更新、対戦・操作変更の特例を除く
- Tiledの`dialogueId`、旧`DialogueDefinition`、`CHARACTER_ACTIONS`を廃止する

完了条件は、DOMが`EventPresentation`だけを描画し、既存の導入・3択・Escape中断・フラグ更新タイミングを維持すること。

## 依存方向

```text
content catalog
  ↓
game domain（MapRuntime / EventRunner）
  ↓
application（GameController）
  ↓
presentation adapters（PixiJS / DOM / battle）
```

- `src/game/`はPixiJS、DOM、音声要素を参照しない
- `src/rendering/`はワールド状態を直接更新せず、`GameController`へcommandを渡す
- コンテンツ固有のmap・actor・event IDはcatalogへ置き、描画本体へ列挙しない
- `window`のCustomEventをゲーム進行の接続に使わない

## 状態の境界

### `WorldState`

シーンをまたいで残す事実だけを保持する。

- scene
- 最後にcheckpointしたmapId、プレイヤー座標、向き
- 操作キャラクター
- イベント変数
- 進行中バトルと直近結果

Phase 1〜3では既存JSON形式との互換を保つ。`flags`の保存形式は変えず、更新口だけを`setFlags(updates)`へまとめてatomicにする。

`GameSession`へ`checkpointPlayer(position: MapPosition)`を追加し、mapIdを含む位置全体を1回のpublishで更新する。既存`updatePlayer()`はPhase 2で削除する。

### `MapRuntime`

現在ロード中の1マップにだけ存在する高頻度状態を保持する。

- プレイヤーの現在座標・向き
- NPCの現在座標・向き・表示状態
- 衝突矩形
- 操作ロック

1フレームごとの移動では`WorldState`をpublishしない。戦闘開始、runtimeのdetach、Controller経由の直列化の直前に、Controllerがプレイヤー位置を`WorldState`へ反映する。アプリケーション層は`GameSession`を直接直列化しない。

`MapRuntime`はPixiJSオブジェクトを保持しない。公開APIは次に限定する。

- `getSnapshot()`: 現在のplayer、actor、lock状態と`version / actorVersion`を読み取り専用で返す。actor配列はactor変更時だけ再生成する
- `getActor()` / `findFacingActor()`: actorを読み取り専用の複製として返す
- `movePlayer(delta, facing)`: 衝突解決後のsnapshotを返す
- `faceActor(entityId, target)`: actorの向きを変更する
- `canChangeControlledCharacter(characterId)`: 操作変更を選択肢へ提示できるか返す
- `validateControlledCharacterChange(characterId)`: 対象actorと必要な表示更新を事前検証する
- `setControlledCharacter(characterId)`: playerとNPCの表示・衝突を同時に更新する
- `setInputLock(reason, locked)`: `event / status / loading / battle`単位でロックを増減する
- `clearInputLocks()`: detach・破棄境界で全reasonを解除する
- `checkpoint()`: mapIdを含む現在の`MapPosition`を返す
- `destroy()`: 状態を破棄し、以後の更新commandを拒否する

描画・カメラ・NPC同期は`getSnapshot()`を現在位置の正とする。DOMは可変な`MapRuntime`を受け取らず、Controllerの`findFacingActor()`だけを使う。描画層はtickerでsnapshotを読み、`actorVersion`が変わった場合だけNPC Sprite群を同期する。`WorldState.player`を移動中の表示に使わない。

ロック解除の責任は`GameController`へ置く。イベント終了・cancel・status closeでは対応reasonだけを解除する。battle遷移では`event / status`を解除して`battle`を追加し、マップ帰還時に`battle`を解除する。runtime detachは全reasonを破棄する。イベント開始・status開始・map loadに失敗した場合は、追加したreasonを`finally`で解除する。

## コンテンツカタログ

### map catalog

mapIdから次を解決する。Phase 1〜3では起動時に1mapをロードし、実行中のmapId変更は扱わない。

- Tiled TMJ raw data
- 外部TSJ raw data
- tileset image URL
- map固有prop asset URLの`Readonly<Record<assetId, URL>>`

初期位置は初期mapのTiled marker `player-start`から解決する。markerはmap内にちょうど1つとし、`facing` propertyを必須とする。`GameSession`側に同じ座標を定数として持たない。保存済み位置からの復元はspawnと一致する必要がない。

`pixi-map.js`は個別のmapファイルやpropをimportしない。未知のmapIdはエラーにし、別mapへ縮退させない。Tiled mapはPhase 1〜3でも外部tilesetをちょうど1件だけ参照する。`parseTiledMap()`後、全propの`assetId`がcatalogのrecordに存在することをview生成前に検証する。

### actor catalog

characterIdからマップ用スプライトシートURLと表示寸法を解決する。既存6キャラクターを単一のcatalogへ移す。

### event catalog

eventIdから`EventDefinition`を解決する。Tiledのactor markerは次の参照を持つ。

- `entityId`: マップ内で永続的に安定するactor ID。空文字を拒否し、map内で一意とする
- `characterId`: actor catalogのID
- `eventId`: 決定操作で開始するevent ID
- `behaviorId`: Phase 1〜3では`idle`のみ

`entityId`はTiledの数値`id`や表示名`name`から推論しない。旧`dialogueId`はPhase 3完了時に使用しない。不明な`characterId / behaviorId`はPhase 1から、不明な`eventId`はPhase 3からマップロード時にエラーにする。

mapごとに全6キャラクターのhomeを必須にはしない。mapに置かれたactorだけをruntimeへ登録する。操作キャラクター変更eventは、対象characterと現在の操作characterに対応するactorがそのmapに存在する場合だけ選択肢へ提示する。会話や対戦はその条件に巻き込まず開始できる。既存広場は6人全員を置くため従来の入れ替えを維持できる。

## EventRunner

イベントはTypeScriptの宣言データとし、stepから任意関数を実行しない。

Phase 1〜3で扱うstep:

- `say`: 話者名、話者characterId、本文、次step
- `choice`: 本文、選択肢、選択後step
- `branch`: event変数の値で次stepを選ぶ
- `branchControlledCharacter`: 操作キャラクターIDで次stepを選ぶ
- `setFlags`: 複数変数をatomicに更新するcommand
- `faceEventTarget`: 会話相手をプレイヤーへ向けるcommand
- `battle`: event対象キャラクターとのバトルを要求するcommand
- `switchControlledActor`: event対象を操作キャラクターへ変更するcommand
- `end`: eventを終了する

Runnerは現在stepを解決し、次の2種類を返す。

1. `EventPresentation`: DOMが表示する会話本文・話者・選択肢
2. `EventCommand[]`: Controllerが順番に処理する状態変更・actor操作・シーン要求

DOMはstep IDやシナリオ分岐を解釈しない。表示完了・選択結果をRunnerへ返すだけとする。

`choice.requirement`は宣言的な表示・実行条件であり、Phase 3では`canSwitchControlledActor`を扱う。Runnerは満たさない選択肢を`EventPresentation`から除外し、非表示choice IDの直接指定も拒否する。各choice nodeには条件なしのfallbackを1つ以上必須とし、実行時にも選択肢が全消滅した不正状態を拒否する。条件追加はdiscriminated unionと網羅チェックへ追加する。

最初はblocking eventを同時に1本だけ実行する。並列event、演出途中の永続化、任意スクリプトは実装しない。

公開API:

- `start(eventId, context, flags)`: active eventがあれば拒否する
- `advance(input, flags)`: `say`の完了または`choiceId`を受け取る
- `cancel()`: active eventを破棄し、未実行commandを捨てる
- `isActive()`: event実行中か返す
- `destroy()`: active eventを破棄し、以後の操作を拒否する

`context.eventTargetEntityId / eventTargetCharacterId / controlledCharacterId`は開始時に固定し、全stepで同じ会話参加者を参照する。`faceEventTarget`で変えた向きはevent終了後も維持し、map再ロードまで戻さない。これは既存挙動と同じである。

step解決順序:

1. `start`または`advance`で次nodeへ移る
2. `branch / branchControlledCharacter / setFlags / faceEventTarget`をpresentationへ到達するまで同期的に連続評価する
3. `setFlags`はRunner内の作業用flagsへ即時反映し、後続`branch`は更新後の値を見る
4. command列を定義順に返す
5. Controllerが全commandを適用してから、返されたpresentationをDOMへ渡す

`battle`と`switchControlledActor`は終端commandとし、発行と同時にeventをinactiveへする。後続nodeは持たない。`end`もeventをinactiveへする。

Escapeによる`cancel()`では、それ以前に適用済みのflagsは残し、現在presentationより後のcommandは実行しない。これにより、選択直後のflagsは残るが最終ページ完了時のflagsは付かない既存挙動を維持する。

## GameController

ゲーム進行の副作用を集約する。

- MapRuntimeのattach / detach
- map位置のcheckpoint
- event開始・進行・終了
- event commandの適用
- 操作キャラクター変更
- バトル要求と完了通知

バトル要求時の順序は固定する。

1. MapRuntimeから現在位置をcheckpoint
2. `GameSession.beginBattle()`
3. battle adapterへ型付きeffectを通知

この順序は、マップ復帰時に会話開始地点へ戻らないための契約である。

Controllerは単一のbattle presenter adapterをmain初期化時に登録する。adapterは`present(payload)`と`resetToMap()`を持つ。未登録時のbattle要求は、状態変更前に拒否する。`present()`中に例外が起きた場合は、次の順に復旧してから例外を再送出する。

1. `GameSession.abortBattleStart()`で未解決battleを破棄してmap sceneへ戻す
2. `resetToMap()`で途中まで変更されたbattle DOMを片づける
3. runtimeの`battle` lockを解除する

terminalのeventは復元せず完了扱いとし、dialogueは閉じたままにする。ユーザーは再度話しかけてやり直せる。`event` lockはbattle command適用前に解除済みとする。effectのqueue・再送・複数購読は持たない。

操作キャラクター変更は次の順序に固定する。

1. `MapRuntime.validateControlledCharacterChange()`と`GameSession`のscene条件を事前検証
2. `MapRuntime.setControlledCharacter()`でruntime全体を先に更新
3. 検証済み更新として`GameSession.swapControlledCharacter()`を適用し、同期購読者へpublish

runtime側はplayer texture対象、旧操作キャラクターのNPC表示、新操作キャラクターのNPC非表示、NPC衝突を1回の更新で切り替える。publish時点ではWorldStateとMapRuntimeの両方が新characterを示す。`swapControlledCharacter()`が失敗した場合はruntimeを旧characterへrollbackし、rollback自体も失敗した場合は両方の例外を`AggregateError`で保持する。

`GameSession`の購読者例外はpublish元へ伝播させず、他の購読者通知を継続してエラー報告する。状態commit後の購読者例外をControllerのtransaction失敗として扱わないためである。

`detachMapRuntime()`はruntime位置のcheckpoint、active eventのcancel、全input lock解除を行ってから参照を外す。`serialize()`もruntimeがattach中なら先にcheckpointする。これらの永続化・ライフサイクル境界を描画adapterへ分散させない。

## 描画adapter

### Pixi map view

- catalogからロード済みのmapを描画する
- MapRuntime snapshotをSpriteへ反映する
- キー・画面コントローラー入力をMapRuntimeまたはGameControllerへ渡す
- 初期`WorldState.player.mapId`のviewを起動時にロードする
- `MapRuntime.inputLocked`だけを移動入力可否の正とし、DOM panel状態はDOM内のキー処理にだけ使う
- map markerと現在の操作characterから必要なcharacter sheetを列挙し、そのmapで使うassetだけをロードする

PixiJSの`Assets.load()`が返すbase textureとTextureSourceは共有cacheの所有物として扱い、map viewから破棄しない。tile・character sheetからview内で生成したsubtextureはview所有として配列で追跡し、view破棄時にsubtextureだけを明示的に破棄する。ContainerとSpriteは`texture: false`で破棄した後、view所有subtextureを破棄する。

実行中の非同期map転送、generation token、rollbackはPhase 5の`transferMap`実装時に定義する。Phase 1〜3で半端な切替APIを公開しない。

### Dialogue DOM view

- `EventPresentation`だけを描画する
- 選択肢移動、決定、閉じる入力を扱う
- event変数、戦闘、操作キャラクターを直接変更しない
- ステータス画面は既存どおり読み取り専用で表示する

Dialogue viewは`GameController.startActorEvent / advanceEvent / cancelEvent`だけを呼ぶ。Status viewは`GameController.openStatus / closeStatus`で`status` lockを管理する。

## 既存コンテンツの移行

- 現在の実画面にガイドentityは存在せず、旧ガイド会話はcharacter会話の分岐により到達不能である。新しいガイドentityは追加しない
- `prototype-guide`は`branch / setFlags / cancel`互換を検証するheadless event fixtureとして移す
- 完了後の再会話は`branch`で`talkedToPrototypeGuide`を評価する
- 6キャラクターの導入会話と「対戦する / 操作を変える / なんでもない」をcharacter eventへ統合する
- クロボシの鳴き声、speaker portrait、会話枠固定高の見た目は維持する
- Tiled actor markerを`entityId / characterId / eventId / behaviorId`へ移行する

## 受け入れ基準

- 既存広場の移動、衝突、カメラ、描画順が変わらない
- headlessの`prototype-guide` fixtureで複数ページ・選択・完了フラグ・再会話を検証できる
- 6キャラクターの導入、3択、操作変更、対戦が維持される
- 会話・ステータス中に移動入力が漏れない
- 戦闘開始前のプレイヤー位置と帰還後の位置が一致する
- 独立したmap定義をcatalogへ登録・解決でき、描画本体にmap IDの分岐を追加しなくてよい
- EventRunnerとMapRuntimeをPixiJS・DOMなしでユニットテストできる
- `pnpm check`を通す
- PC 1280×720とスマートフォン横844×390で既存広場を確認する

ユニットテスト対象API:

- map catalog: 登録済みmap解決、未知map拒否、prop asset不足拒否、`player-start`からの初期位置解決
- Tiled actor: `entityId`の空文字・重複、未知`characterId / behaviorId / eventId`をPhaseごとの契約で拒否
- GameSession: mapId込み`checkpointPlayer()`と複数値`setFlags()`がそれぞれ1回だけpublishされること、購読者例外が他の通知とcommitを壊さないこと、`abortBattleStart()`がsceneとactive battleを復元すること
- MapRuntime: 生成、move、version付きsnapshot、actor配列再利用、lock reasonの独立性、操作character変更、checkpoint、destroy後command拒否
- EventRunner: start、say advance、choiceとrequirement、setFlags後branch、cancel、同時event拒否、command定義順、presentation前適用、battle/switch終端、destroy後操作拒否
- GameController: checkpoint→battle順序、presenter未登録拒否、presenter例外時のWorldState・battle UI・event/lock整合性、操作変更のpublish中整合性と失敗時rollback、detach・serialize時checkpoint
