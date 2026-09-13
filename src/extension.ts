import * as vscode from 'vscode';

const EXTENSION_ID = 'customlinkopener';
const DEFAULT_SELECTION_PLACEHOLDER = '{selection}';
const DEFAULT_ITEMS: LinkItem[] = [
	{
		url: 'https://jira.mycompany.com/issues/{selection}',
		sampleSelection: 'ABC-<number>',
	},
];

interface LinkItem {
	url: string;
	sampleSelection: string;
}

export function activate(context: vscode.ExtensionContext) {
	const computeContextVisibility = () => {
		const editor = vscode.window.activeTextEditor;
		const selectionText = editor ? getSelectionText(editor) : '';
		const items = getConfiguredItems();
		const matchingItem = getMatchingConfiguredItem(selectionText, items);
		const hasMatchingSelection = Boolean(matchingItem);

		void vscode.commands.executeCommand('setContext', 'customlinkopener.hasMatchingSelection', hasMatchingSelection);
	};

	const openConfiguredItem = async (item: LinkItem) => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('Please open a file before using Custom Link Opener.');
			return;
		}

		const selectionText = getSelectionText(editor);
		if (!selectionText) {
			vscode.window.showWarningMessage('Please select some text before using Custom Link Opener.');
			return;
		}

		const urlTemplate = item.url.length > 0 ? item.url : DEFAULT_ITEMS[0].url;
		const targetUrl = buildTargetUrl(urlTemplate, selectionText, DEFAULT_SELECTION_PLACEHOLDER);

		await vscode.env.openExternal(vscode.Uri.parse(targetUrl));
		vscode.window.setStatusBarMessage(`Open link opened for ${selectionText}`, 3000);
	};

	const openInJira = async () => {
		const items = getConfiguredItems();
		if (items.length === 0) {
			vscode.window.showWarningMessage('No custom link items are configured yet.');
			return;
		}

		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('Please open a file before using Custom Link Opener.');
			return;
		}

		const selectionText = getSelectionText(editor);
		if (!selectionText) {
			vscode.window.showWarningMessage('Please select some text before using Custom Link Opener.');
			return;
		}

		const matchingItem = getMatchingConfiguredItem(selectionText, items);
		if (!matchingItem) {
			vscode.window.showWarningMessage('No configured link matches the current selection.');
			return;
		}

		await openConfiguredItem(matchingItem);
	};

	const openInJiraCommand = vscode.commands.registerCommand(`${EXTENSION_ID}.openInJira`, openInJira);
	const selectionListener = vscode.window.onDidChangeTextEditorSelection(() => {
		computeContextVisibility();
	});
	const configListener = vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration(`${EXTENSION_ID}.items`)) {
			computeContextVisibility();
		}
	});

	context.subscriptions.push(openInJiraCommand, selectionListener, configListener);
	computeContextVisibility();
}

export function buildTargetUrl(
	urlTemplate: string,
	selection: string,
	selectionPlaceholder: string = DEFAULT_SELECTION_PLACEHOLDER,
): string {
	const safeSelection = encodeURIComponent(selection);

	if (selectionPlaceholder && urlTemplate.includes(selectionPlaceholder)) {
		return urlTemplate.replace(new RegExp(escapeRegExp(selectionPlaceholder), 'g'), safeSelection);
	}

	const normalizedTemplate = urlTemplate.endsWith('/') ? urlTemplate : `${urlTemplate}/`;
	return `${normalizedTemplate}${safeSelection}`;
}

export function buildPreviewUrl(
	urlTemplate: string,
	selection: string,
	selectionPlaceholder: string = DEFAULT_SELECTION_PLACEHOLDER,
): string {
	return buildTargetUrl(urlTemplate, selection, selectionPlaceholder);
}

export function matchesSampleSelection(selectionText: string, sampleSelection: string): boolean {
	const normalizedSelection = selectionText.trim();
	const normalizedSample = sampleSelection.trim();

	if (!normalizedSample) {
		return false;
	}

	if (!normalizedSample.includes('<number>')) {
		return normalizedSelection.includes(normalizedSample);
	}

	const escapedPattern = normalizedSample
		.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		.replace(/<number>/g, '\\d+');

	return new RegExp(`^${escapedPattern}$`).test(normalizedSelection);
}

export function getMatchingConfiguredItem(selectionText: string, items: LinkItem[]): LinkItem | undefined {
	const normalizedSelection = selectionText.trim();

	return items.find((item) => {
		const sampleSelection = item.sampleSelection.trim();
		return sampleSelection.length > 0 && matchesSampleSelection(normalizedSelection, sampleSelection);
	});
}

function getConfiguredItems(): LinkItem[] {
	const config = vscode.workspace.getConfiguration(EXTENSION_ID);
	const items = config.get<LinkItem[]>('items', DEFAULT_ITEMS);

	return (items ?? [])
		.filter((item): item is LinkItem => typeof item?.url === 'string' && item.url.length > 0)
		.map((item) => ({
			url: item.url,
			sampleSelection: typeof item.sampleSelection === 'string' ? item.sampleSelection.trim() : '',
		}));
}

function getSelectionText(editor: vscode.TextEditor): string {
	const selectedSegments = editor.selections
		.filter((selection) => !selection.isEmpty)
		.map((selection) => editor.document.getText(selection))
		.filter((value) => value.length > 0);

	return selectedSegments.join(', ');
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function deactivate() {}
