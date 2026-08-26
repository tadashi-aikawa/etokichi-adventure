import { describe, expect, it } from "vitest";
import { createEventCatalog } from "../src/content/event-catalog.ts";
import { createMapContentCatalog, validateMapPropAssets } from "../src/content/map-catalog.ts";
import { createMap } from "./fixtures/map.ts";

describe("content catalog", () => {
  it("未知と重複のmapIdを拒否する", () => {
    const definition = {
      id: "map-a",
      mapSource: "{}",
      tilesetSource: "{}",
      tilesetImageUrl: "tiles.svg",
      propUrls: {},
    };
    const catalog = createMapContentCatalog([definition]);
    expect(catalog.get("map-a")).toBe(definition);
    expect(() => catalog.get("unknown")).toThrow("catalogに登録されていません");
    expect(() => createMapContentCatalog([definition, definition])).toThrow("重複");
  });

  it("mapが参照する未知のprop assetを描画前に拒否する", () => {
    const map = createMap();
    map.props.push({ id: 1, name: "gate", assetId: "gate", x: 0, y: 0, width: 32, height: 32 });
    expect(() => validateMapPropAssets(map, {})).toThrow("map catalogに登録されていません");
    expect(() => validateMapPropAssets(map, { gate: "gate.svg" })).not.toThrow();
  });

  it("eventの重複IDと不明な初期nodeを拒否する", () => {
    const definition = {
      id: "event-a",
      initialNodeId: "end",
      nodes: { end: { id: "end", type: "end" as const } },
    };
    expect(() => createEventCatalog([definition, definition])).toThrow("重複");
    expect(() => createEventCatalog([{ ...definition, initialNodeId: "missing" }])).toThrow("初期node");
    expect(() =>
      createEventCatalog([
        {
          id: "broken-link",
          initialNodeId: "line",
          nodes: { line: { id: "line", type: "say", speaker: "test", text: "test", nextNodeId: "missing" } },
        },
      ]),
    ).toThrow("遷移先 missing");
    expect(() =>
      createEventCatalog([
        {
          id: "duplicate-choice",
          initialNodeId: "choice",
          nodes: {
            choice: {
              id: "choice",
              type: "choice",
              speaker: "test",
              text: "test",
              choices: [
                { id: "same", label: "A", nextNodeId: "end" },
                { id: "same", label: "B", nextNodeId: "end" },
              ],
            },
            end: { id: "end", type: "end" },
          },
        },
      ]),
    ).toThrow("choice IDが不正");
  });
});
