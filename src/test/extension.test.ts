import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';


interface MenuContribution {
	command: string;
	when?: string;
}

interface PackageJson {
	contributes?: {
		menus?: {
			'editor/context'?: MenuContribution[];
		};
	};
}

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('Add as Cairn context menu entry', () => {
		// vscode has no command to introspect the rendered context menu,
		// so we assert against the extension's own contribution instead.
		const pkgPath = path.join(__dirname, '../../../package.json');
		const pkg: PackageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
		const contextMenuItems = pkg.contributes?.menus?.['editor/context'] ?? [];

		const addAsCairnItem = contextMenuItems.find(item => item.command === 'scarce.addAsCairn');
		assert.ok(addAsCairnItem, 'Add as Cairn menu item not found in editor/context contributions');
	});
});
