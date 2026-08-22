# 開発ガイド

## 技術構成

- Vite + pnpmで配信・ビルドするブラウザゲーム
- PixiJS 8のWebGPU/WebGLレンダラーでアリーナ、キャラクター、技エフェクト、スマートフォン横画面の操作レールを描画
- DOM/CSSでHUD、PC向け操作、画面遷移、文字情報を描画
- Vitestでキャラクター定義と純粋な戦闘計算をテスト

DOMのみでゲームを描画するバックエンドはありません。PixiJSの初期化完了後にゲーム本体を読み込み、WebGPUとWebGLの両方を利用できない環境では起動を中止します。

## 主なファイルと責務

| パス | 責務 |
| --- | --- |
| `src/main.js` | WebGPU/WebGLの選択、PixiJS初期化、ゲーム本体の起動 |
| `game.js` | ゲーム進行、入力、AI、画面遷移、DOM製UI、GPU描画への指示 |
| `src/rendering/pixi-stage.js` | PixiJSレンダラー、アリーナ、カメラ、描画システムの統合 |
| `src/rendering/pixi-controls.js` | スマートフォン横画面の十字キー、技、PUSHの描画とPointer Events入力 |
| `src/rendering/pixi-fighters.js` | キャラクター画像、動作、状態オーラ、陣営反転 |
| `src/rendering/pixi-effects.js` | 技・命中・状態変化・勝利演出のGPUエフェクト |
| `src/game/` | キャラクター定義、戦闘計算、アニメーション計画などの純粋なTypeScriptロジック |
| `src/actor-assets.ts` | Viteで配信するキャラクター画像URLの解決 |
| `index.html` / `styles.css` | HUD、操作、選択画面、文字演出の構造と見た目 |
| `tests/` | `src/game/` のユニットテスト |

`#hero-sprite`と`#enemy-sprite`は画面には表示しませんが、削除しないでください。`game.js`が`src`とclassを更新し、`pixi-fighters.js`がMutationObserverで変更を受け取るための状態同期インターフェースです。

## 描画バックエンド

通常はWebGPUを試し、初期化に失敗した場合だけWebGLへ切り替えます。検証時はURLクエリで指定できます。

- `?renderer=webgpu`: WebGPUを試し、失敗時はWebGL
- `?renderer=webgl`: WebGLを指定
- 無指定または未知の値: 自動選択

技エフェクトを追加するときは、`game.js`から渡すイベントと`pixi-effects.js`のhandlerを同時に追加します。未実装のイベントは例外にして、DOM代替演出へ黙って縮退させません。キャラクター固有の動作は、DOM要素のclassを状態通知として使うか、`startFighterMotion`へ明示的な軌道を渡します。

## 開発と検証

```sh
pnpm dev
pnpm check
```

ブラウザ確認では次を最低限確認します。

1. 無指定URLでタイトル画面が開き、開発者コンソールに選択されたGPUバックエンドが出る
2. `?renderer=webgl`でキャラクター選択から対戦開始まで進める
3. WebGPUを利用できる環境では`?renderer=webgpu`でも同じ導線を確認する
4. 移動、通常技、固有技、MISS、状態変化、K.O.後の結果表示でコンソールエラーが出ない
5. スマートフォン相当の横画面で、左右の操作レールと両者の4技・選択技名・ガッツ・命中率が収まり、十字キーの長押しと解除、技切替、技、PUSHが反応する

`pnpm check`は型検査、lint、format確認、ユニットテスト、本番ビルドを順に実行します。GitHub Pagesへの配信は`.github/workflows/deploy.yml`が担当します。

## アセット

- エトキチ: `assets/etokichi/`
- その他のキャラクター: `assets/enemies/<ID>/`または`assets/characters/<ID>/`
- 背景: `assets/backgrounds/`
- BGM・SE素材: `assets/audio/`

キャラクター設定から参照する画像は`src/actor-assets.ts`を経由させ、開発サーバーとGitHub Pagesのどちらでも同じURL解決経路を使います。
