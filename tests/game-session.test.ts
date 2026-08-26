import { describe, expect, it, vi } from "vitest";
import { createGameSession, createInitialWorldState, parseWorldState } from "../src/game/game-session.ts";

describe("ゲームセッション", () => {
  it("タイトル・マップ・バトルをワールド状態として遷移する", () => {
    const session = createGameSession();

    expect(session.getState().scene).toBe("title");
    session.enterMap({ mapId: "test-map", x: 128, y: 96, facing: "right" });
    session.setFlags({ talkedToGuide: true });
    session.beginBattle({ encounterId: "guide-battle", opponentId: "kuroboshi" });

    expect(session.getState()).toMatchObject({
      scene: "battle",
      controlledCharacterId: "etokichi",
      player: { mapId: "test-map", x: 128, y: 96, facing: "right" },
      flags: { talkedToGuide: true },
      activeBattle: { encounterId: "guide-battle", heroId: "etokichi", returnScene: "map", result: null },
    });

    session.resolveBattle({ outcome: "win", reason: "ko" });
    session.leaveBattle();

    expect(session.getState()).toMatchObject({
      scene: "map",
      player: { mapId: "test-map", x: 128, y: 96, facing: "right" },
      flags: { talkedToGuide: true },
      activeBattle: null,
      lastBattle: {
        encounterId: "guide-battle",
        heroId: "etokichi",
        opponentId: "kuroboshi",
        outcome: "win",
        reason: "ko",
      },
    });
  });

  it("再戦時は同じエンカウントを維持して結果だけを戻す", () => {
    const session = createGameSession();
    session.beginBattle({ encounterId: "trial", opponentId: "sutekichi", returnScene: "title" });
    session.resolveBattle({ outcome: "loss", reason: "time" });
    session.restartBattle();

    expect(session.getState()).toMatchObject({
      scene: "battle",
      activeBattle: {
        encounterId: "trial",
        heroId: "etokichi",
        opponentId: "sutekichi",
        returnScene: "title",
        result: null,
      },
      lastBattle: { encounterId: "trial", outcome: "loss" },
    });
  });

  it("直列化した状態を同じ内容で復元できる", () => {
    const session = createGameSession();
    session.enterMap({ x: 220, y: 180, facing: "up" });
    session.setFlags({ route: "north" });

    expect(parseWorldState(session.serialize())).toEqual(session.getState());
  });

  it("操作キャラクターをキャラクターIDで変更する", () => {
    const session = createGameSession();
    session.enterMap();

    session.swapControlledCharacter("sutekichi");
    expect(session.getState().controlledCharacterId).toBe("sutekichi");
    expect(() => session.swapControlledCharacter("sutekichi")).toThrow("sutekichiはすでに操作中です");

    session.swapControlledCharacter("etokichi");
    expect(session.getState().controlledCharacterId).toBe("etokichi");

    session.swapControlledCharacter("sutekichi");
    session.beginBattle({ encounterId: "switched", opponentId: "etokichi" });
    expect(session.getState().activeBattle).toMatchObject({ heroId: "sutekichi", opponentId: "etokichi" });
  });

  it("不正な状態や未解決バトルの退出を拒否する", () => {
    const session = createGameSession();
    expect(() => parseWorldState('{"version":1,"scene":"map"}')).toThrow("ワールド状態の形式が不正です");
    expect(() => session.leaveBattle()).toThrow("未解決のバトルからは退出できません");
    session.beginBattle({ encounterId: "trial", opponentId: "aster" });
    expect(() => session.enterMap()).toThrow("進行中のバトルからは直接マップへ移れません");
    expect(() => session.beginBattle({ encounterId: "duplicate", opponentId: "tatsuo" })).toThrow(
      "進行中のバトルがあります",
    );
  });

  it("未知のキャラクターIDを含む復元データを拒否する", () => {
    const state = createInitialWorldState();
    const serialized = JSON.stringify({
      ...state,
      scene: "battle",
      activeBattle: {
        encounterId: "unknown",
        heroId: "etokichi",
        opponentId: "unknown-character",
        returnScene: "map",
        result: null,
      },
    });

    expect(() => parseWorldState(serialized)).toThrow("ワールド状態の形式が不正です");
  });

  it("旧バージョンのワールド状態を拒否する", () => {
    const state = createInitialWorldState();
    expect(() => parseWorldState(JSON.stringify({ ...state, version: 1 }))).toThrow("ワールド状態の形式が不正です");
  });

  it("バトルシーンと進行中エンカウントが食い違う復元データを拒否する", () => {
    const state = createInitialWorldState();
    const serialized = JSON.stringify({
      ...state,
      scene: "map",
      activeBattle: {
        encounterId: "hidden-battle",
        heroId: "etokichi",
        opponentId: "kuroboshi",
        returnScene: "map",
        result: null,
      },
    });

    expect(() => parseWorldState(serialized)).toThrow("ワールド状態の形式が不正です");
  });

  it("購読者へ外部から変更できないスナップショットを通知する", () => {
    const session = createGameSession(createInitialWorldState());
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);

    session.checkpointPlayer({ ...session.getState().player, x: 720 });
    const notifiedState = listener.mock.calls[0]?.[0];
    expect(notifiedState).toBeDefined();
    if (!notifiedState) throw new Error("ゲームセッションから状態が通知されていません");
    notifiedState.player.x = -1;
    expect(session.getState().player.x).toBe(720);

    unsubscribe();
    session.checkpointPlayer({ ...session.getState().player, y: 420 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("checkpointと複数event変数更新をそれぞれ1回の通知でcommitする", () => {
    const session = createGameSession();
    const listener = vi.fn();
    session.subscribe(listener);

    session.checkpointPlayer({ mapId: "prototype-plaza", x: 640, y: 360, facing: "left" });
    session.setFlags({ route: "west", talked: true });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(session.getState()).toMatchObject({
      player: { mapId: "prototype-plaza", x: 640, y: 360, facing: "left" },
      flags: { route: "west", talked: true },
    });
  });

  it("購読者の例外を隔離して後続購読者へ通知する", () => {
    const session = createGameSession();
    const report = vi.spyOn(console, "error").mockImplementation(() => {});
    const listener = vi.fn();
    session.subscribe(() => {
      throw new Error("view failed");
    });
    session.subscribe(listener);

    expect(() => session.setFlags({ committed: true })).not.toThrow();
    expect(session.getState().flags.committed).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
    expect(report).toHaveBeenCalledOnce();
    report.mockRestore();
  });

  it("表示開始に失敗した未解決バトルを直前のsceneへ戻す", () => {
    const session = createGameSession();
    session.enterMap();
    session.beginBattle({ encounterId: "rollback", opponentId: "aster" });

    session.abortBattleStart();

    expect(session.getState()).toMatchObject({ scene: "map", activeBattle: null });
    expect(() => session.abortBattleStart()).toThrow("開始を中断できるバトルがありません");
  });
});
