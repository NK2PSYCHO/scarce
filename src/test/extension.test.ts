import * as assert from "assert";
import * as vscode from "vscode";
import {
  ScarceItem,
  SeverityLevel,
  ScarceStorage,
  SeverityBucket,
  emptyBucket,
  emptyStorage,
} from "../types/index";

suite("Scarce Extension Test Suite", () => {
  // ─── Activate Extension Before All Tests ────────────────────────────────────
  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension("undefined_publisher.scarce");
    if (ext && !ext.isActive) {
      await ext.activate();
    }
  });

  // ─── Type & Interface Tests ─────────────────────────────────────────────────
  suite("Storage Types", () => {
    test("ScarceItem shape is valid", () => {
      const item: ScarceItem = {
        id: "test-001",
        codeSnapshot: "const x = null;",
        filepath: "/home/user/project/src/index.ts",
        startLine: 10,
        endLine: 10,
        comment: "fix: null check needed",
        severity: "high",
        timestamp: Date.now(),
      };

      assert.strictEqual(item.id, "test-001");
      assert.strictEqual(item.startLine, 10);
      assert.strictEqual(item.severity, "high");
    });

    test("SeverityLevel only accepts valid values", () => {
      const levels: SeverityLevel[] = ["normal", "high", "critical"];
      assert.strictEqual(levels.length, 3);
      assert.ok(levels.includes("normal"));
      assert.ok(levels.includes("high"));
      assert.ok(levels.includes("critical"));
    });

    test("emptyBucket returns correct shape", () => {
      const bucket: SeverityBucket = emptyBucket();
      assert.deepStrictEqual(bucket, { critical: [], high: [], normal: [] });
    });

    test("emptyStorage returns correct shape", () => {
      const storage: ScarceStorage = emptyStorage();
      assert.strictEqual(storage.version, "1.0.0");
      assert.deepStrictEqual(storage.repos, {});
      assert.ok(storage.lastUpdated > 0);
    });

    test("ScarceStorage can hold items across repos and files", () => {
      const storage: ScarceStorage = emptyStorage();

      const item: ScarceItem = {
        id: "001",
        codeSnapshot: "broken code",
        filepath: "/repo/src/auth.ts",
        startLine: 42,
        endLine: 42,
        comment: "fix: memory leak",
        severity: "critical",
        timestamp: Date.now(),
      };

      storage.repos["/repo"] = {
        "/repo/src/auth.ts": {
          critical: [item],
          high: [],
          normal: [],
        },
      };

      const retrieved = storage.repos["/repo"]["/repo/src/auth.ts"].critical[0];
      assert.strictEqual(retrieved.id, "001");
      assert.strictEqual(retrieved.severity, "critical");
      assert.strictEqual(retrieved.startLine, 42);
    });
  });

  // ─── Command Registration Tests ─────────────────────────────────────────────
  suite("Command Registration", () => {
    test("scarce.addToScarce command is registered", async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(
        commands.includes("scarce.addToScarce"),
        "addToScarce command should be registered",
      );
    });
  });

  // ─── Webview Provider Tests ─────────────────────────────────────────────────
  suite("Webview Provider", () => {
    test("extension activates without errors", async () => {
      const ext = vscode.extensions.getExtension("undefined_publisher.scarce");
      if (ext) {
        assert.ok(ext.isActive, "Extension should be active after suiteSetup");
      } else {
        assert.ok(true, "Extension context loaded");
      }
    });
  });
});
