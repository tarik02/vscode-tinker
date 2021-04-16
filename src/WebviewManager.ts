import * as vscode from 'vscode'


const getRandomNonce = () => {
	let text = ''
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length))
	}
	return text
}

export class WebviewManager implements vscode.WebviewPanelSerializer {
	protected extensionUri: vscode.Uri
	public readonly id: string
	protected title: string
	protected messageHandler: ((message: any) => void) | undefined

	protected panel: vscode.WebviewPanel | undefined
	protected initializedPromise: Promise<void> | undefined

	public constructor(
		extensionUri: vscode.Uri,
		id: string,
		title: string,
		messageHandler: ((message: any) => void) | undefined = undefined,
	) {
		this.extensionUri = extensionUri
		this.id = id
		this.title = title
		this.messageHandler = messageHandler
	}

	public ensureCreated(): boolean {
		if (this.panel !== undefined) {
			return false
		}

		const column = vscode.ViewColumn.Beside

		const panel = vscode.window.createWebviewPanel(
			this.id,
			this.title,
			column,
			{
				enableFindWidget: true,
				enableScripts: true,
				// retainContextWhenHidden: true,
				localResourceRoots: [
					vscode.Uri.joinPath(this.extensionUri, 'resources/webview'),
				],
			},
		)

		this.panel = panel

		this.panel.onDidDispose(() => {
			if (panel === this.panel) {
				this.panel = undefined
			}
		})

		this.initializedPromise = new Promise(resolve => {
			const listenerDisposable = this.panel!.webview.onDidReceiveMessage(message => {
				if (message.type === 'ready') {
					listenerDisposable.dispose()

					resolve()
				}
			})
		})

		this.setDetached()

		this.panel.webview.onDidReceiveMessage(message => this.onMessage(message))

		this.panel.webview.html = this.getHtmlForWebview(this.panel.webview)

		return true
	}

	public ensureVisible(): void {
		this.ensureCreated()

		const column = vscode.ViewColumn.Beside

		this.panel!.reveal(column)
	}

	public setAttached(): void {
		this.send({
			type: 'set-attached',
		})
	}

	public setDetached(): void {
		this.send({
			type: 'set-detached',
		})
	}

	public async send(message: any): Promise<void> {
		await this.initializedPromise

		this.panel?.webview.postMessage(message)
	}

	public dispose(): void {
		this.panel?.dispose()
		this.panel = undefined
	}

	async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel): Promise<void> {
		this.dispose()

		this.panel = webviewPanel
		this.panel.onDidDispose(() => {
			if (webviewPanel === this.panel) {
				this.panel = undefined
			}
		})

		this.initializedPromise = new Promise(resolve => {
			const listenerDisposable = webviewPanel.webview.onDidReceiveMessage(message => {
				if (message.type === 'ready') {
					listenerDisposable.dispose()

					resolve()
				}
			})
		})

		this.setDetached()

		webviewPanel.webview.onDidReceiveMessage(message => this.onMessage(message))

		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview)
	}

	private async onMessage(message: any) {
		switch (message.type) {
		case 'open':
			const uri = vscode.Uri.file(message.file)
			const editor = await vscode.window.showTextDocument(uri)
			editor.revealRange(
				new vscode.Range(message.line, 0, message.line, 0),
				vscode.TextEditorRevealType.InCenter,
			)
			break
		}

		this.messageHandler?.(message)
	}

	private getHtmlForWebview(webview: vscode.Webview) {
		const scriptsPathOnDisk = vscode.Uri.joinPath(this.extensionUri, 'resources/webview')
		const scriptsUri = webview.asWebviewUri(scriptsPathOnDisk)

		const stylesPath = vscode.Uri.joinPath(this.extensionUri, 'resources/webview')
		const stylesUri = webview.asWebviewUri(stylesPath)

		const nonce = getRandomNonce()

		return (
			`
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-eval';">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link href="${stylesUri}/reset.css" rel="stylesheet">
	<link href="${stylesUri}/vscode.css" rel="stylesheet">
	<link href="${stylesUri}/custom.css" rel="stylesheet">
	<title>Cat Coding</title>
</head>
<body>
	<div id="app"></div>
	<script nonce="${nonce}" src="${scriptsUri}/vue.global.prod.js"></script>
	<script nonce="${nonce}" src="${scriptsUri}/main.js"></script>
</body>
</html>
`
		).trim()
	}
}
