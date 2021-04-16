import * as execa from 'execa'
import * as path from 'path'
import * as vscode from 'vscode'

import { ProcessManager } from './ProcessManager'
import { linkProcessWithWebview } from './utils/linkProcessWithWebview'
import { WebviewManager } from './WebviewManager'


let tinkerViewManager: WebviewManager
let dumpViewManager: WebviewManager

const tinkerProcess = new ProcessManager({
	onStarted: process => {
		tinkerViewManager.ensureVisible()
		tinkerViewManager.setAttached()

		linkProcessWithWebview(process, tinkerViewManager)
	},
	onStopped: (reason, code, error) => {
		if (error !== undefined) {
			console.error(error)
		}

		tinkerViewManager.setDetached()

		const exitCodeString = (code !== undefined
			? ` (exit code ${code})`
			: ''
		)

		switch (reason) {
		case 'exit':
			tinkerViewManager.send({
				type: 'service',
				message: `Script exited${exitCodeString}.`,
			})
			break

		case 'killed':
			tinkerViewManager.send({
				type: 'service',
				message: `Script killed${exitCodeString}.`,
			})
			break

		case 'error':
			tinkerViewManager.send({
				type: 'service',
				message: `Script thrown an error${exitCodeString}: ${error}`,
			})
			break
		}
	},
})

const dumpServerProcess = new ProcessManager({
	onStarted: process => {
		dumpViewManager.ensureVisible()
		dumpViewManager.setAttached()

		linkProcessWithWebview(process, dumpViewManager)
	},
	onStopped: (reason, code, error) => {
		if (error !== undefined) {
			console.error(error)
		}

		dumpViewManager.setDetached()

		const exitCodeString = (code !== undefined
			? ` (exit code ${code})`
			: ''
		)

		switch (reason) {
		case 'exit':
			dumpViewManager.send({
				type: 'service',
				message: `Dump server exited${exitCodeString}.`,
			})
			break

		case 'killed':
			dumpViewManager.send({
				type: 'service',
				message: `Dump server killed${exitCodeString}.`,
			})
			break

		case 'error':
			dumpViewManager.send({
				type: 'service',
				message: `Dump server thrown an error${exitCodeString}: ${error}`,
			})
			break
		}
	},
})

export function activate(context: vscode.ExtensionContext): void {
	tinkerViewManager = new WebviewManager(
		context.extensionUri,
		'tinker',
		'Tinker Output',
		message => {
			switch (message.type) {
			case 'stop':
				tinkerProcess.stop()
				break
			}
		},
	)

	dumpViewManager = new WebviewManager(
		context.extensionUri,
		'tinker.dump-server',
		'Dump Server',
		message => {
			switch (message.type) {
			case 'stop':
				if (dumpServerProcess.isRunning) {
					dumpServerProcess.stop()
				}
				break
			}
		},
	)

	context.subscriptions.push(
		vscode.commands.registerCommand('vscode-tinker.tinker.run', runCurrentTinkerDocument),
		vscode.commands.registerCommand('vscode-tinker.dump-server.start', startDumpServer),
		vscode.commands.registerCommand('vscode-tinker.dump-server.stop', stopDumpServer),
		vscode.window.registerWebviewPanelSerializer(tinkerViewManager.id, tinkerViewManager),
		vscode.window.registerWebviewPanelSerializer(dumpViewManager.id, dumpViewManager),
	)
}

export function deactivate(): void {
	if (tinkerProcess.isRunning) {
		tinkerProcess.stop()
	}

	if (dumpServerProcess.isRunning) {
		dumpServerProcess.stop()
	}
}

export async function runCurrentTinkerDocument(): Promise<void> {
	const editor = vscode.window.activeTextEditor

	if (editor === undefined) {
		vscode.window.showErrorMessage('There is no document to run')
		return
	}

	let code

	if (editor.selections.length === 1 && ! editor.selection.isEmpty) {
		code = editor.document.getText(editor.selection)
	} else {
		code = editor.document.getText()
	}

	runTinkerDocument(editor.document, code)
}

export async function runTinkerDocument(document: vscode.TextDocument, input: string): Promise<void> {
	try {
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)
		if (!workspaceFolder) {
			vscode.window.showErrorMessage('You don\'t have any workspace open')
			return
		}

		if (workspaceFolder.uri.scheme !== 'file') {
			vscode.window.showErrorMessage('You can only open local folders')
			return
		}

		const artisanUri = vscode.Uri.joinPath(workspaceFolder.uri, 'artisan')

		try {
			await vscode.workspace.fs.stat(artisanUri)
		} catch (e) {
			if (e instanceof vscode.FileSystemError) {
				if (e.code === 'FileNotFound') {
					vscode.window.showErrorMessage('Artisan not found in your working directory')
					return
				}
			}

			vscode.window.showErrorMessage('Error: ' + e)
			throw e
		}

		if (tinkerProcess.isRunning) {
			vscode.window.showErrorMessage('Tinker process is already running')
			return
		}

		tinkerProcess.start(
			() => execa(
				'php',
				[
					path.join(__dirname, '../resources/VscodeTinker/wrapper.php'),
					'tinker',
				],
				{
					env: {
						WORKSPACE_DIR: workspaceFolder.uri.fsPath,
					},
					input,
				},
			),
		)
	} catch (e) {
		vscode.window.showErrorMessage('Error: ' + e)
		console.error(e)
	}
}

export async function startDumpServer(): Promise<void> {
	if (dumpServerProcess.isRunning) {
		vscode.window.showErrorMessage('Dump server is already running')
		return
	}

	try {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0]

		if (!workspaceFolder) {
			vscode.window.showErrorMessage('You don\'t have any workspace open')
			return
		}

		if (workspaceFolder.uri.scheme !== 'file') {
			vscode.window.showErrorMessage('You can only open local folders')
			return
		}

		const artisanUri = vscode.Uri.joinPath(workspaceFolder.uri, 'artisan')

		try {
			await vscode.workspace.fs.stat(artisanUri)
		} catch (e) {
			if (e instanceof vscode.FileSystemError) {
				if (e.code === 'FileNotFound') {
					vscode.window.showErrorMessage('Artisan not found in your working directory')
					return
				}
			}

			vscode.window.showErrorMessage('Error: ' + e)
			throw e
		}

		dumpServerProcess.start(
			() => execa(
				'php',
				[
					path.join(__dirname, '../resources/VscodeTinker/server.php'),
				],
				{
					env: {
						WORKSPACE_DIR: workspaceFolder.uri.fsPath,
					},
				},
			),
		)
	} catch (e) {
		vscode.window.showErrorMessage('Error: ' + e)
		console.error(e)
	}
}

export function stopDumpServer(): void {
	if (! dumpServerProcess.isRunning) {
		vscode.window.showErrorMessage('Dump server is not running')
		return
	}

	dumpServerProcess.stop()
}
