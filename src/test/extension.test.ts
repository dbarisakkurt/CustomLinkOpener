import * as assert from 'assert';

import * as vscode from 'vscode';
import { buildPreviewUrl, buildTargetUrl, getMatchingConfiguredItem, matchesSampleSelection } from '../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('buildTargetUrl inserts the selected text into a template URL', () => {
		assert.strictEqual(
			buildTargetUrl('https://jira.mycompany.com/issues/{selection}', 'ABC-123'),
			'https://jira.mycompany.com/issues/ABC-123'
		);
	});

	test('buildTargetUrl encodes reserved characters in the selected text', () => {
		assert.strictEqual(
			buildTargetUrl('https://jira.mycompany.com/issues/{selection}', 'ABC 123'),
			'https://jira.mycompany.com/issues/ABC%20123'
		);
	});

	test('buildPreviewUrl uses the configured placeholder and sample selection', () => {
		assert.strictEqual(
			buildPreviewUrl('https://jira.mycompany.com/issues/{selection}', 'ABC-123', '{selection}'),
			'https://jira.mycompany.com/issues/ABC-123'
		);
	});

	test('matchesSampleSelection supports <number> placeholders', () => {
		assert.strictEqual(matchesSampleSelection('ABC-1', 'ABC-<number>'), true);
		assert.strictEqual(matchesSampleSelection('ABC-4343', 'ABC-<number>'), true);
		assert.strictEqual(matchesSampleSelection('FGH-1234-AR', 'FGH-<number>-AR'), true);
		assert.strictEqual(matchesSampleSelection('FGH-1-AR', 'FGH-<number>-AR'), true);
		assert.strictEqual(matchesSampleSelection('DE+65', 'DE+<number>'), true);
		assert.strictEqual(matchesSampleSelection('DE_65_45', 'DE_<number>_<number>'), true);
		assert.strictEqual(matchesSampleSelection('D!12!!!567', 'D!<number>!!!<number>'), true);
		assert.strictEqual(matchesSampleSelection('D!1!!!1', 'D!<number>!!!<number>'), true);
		assert.strictEqual(matchesSampleSelection('D!123!!!5', 'D!<number>!!!<number>'), true);
		assert.strictEqual(matchesSampleSelection('D!1!!!7', 'D!<number>!!!<number>'), true);
		assert.strictEqual(matchesSampleSelection('ABC-1X', 'ABC-<number>'), false);
	});

	test('getMatchingConfiguredItem prefers the first configured item whose sample matches the selection', () => {
		const items = [
			{ url: 'https://url1.example/{selection}', sampleSelection: 'ABC-<number>' },
			{ url: 'https://url2.example/{selection}', sampleSelection: 'DE+<number>' },
			{ url: 'https://url3.example/{selection}', sampleSelection: 'DE_<number>_<number>' },
		];

		assert.deepStrictEqual(getMatchingConfiguredItem('ABC-123', items), items[0]);
		assert.deepStrictEqual(getMatchingConfiguredItem('DE+65', items), items[1]);
		assert.deepStrictEqual(getMatchingConfiguredItem('DE_65_45', items), items[2]);
		assert.strictEqual(getMatchingConfiguredItem('ZZZ-123', items), undefined);
	});
});
