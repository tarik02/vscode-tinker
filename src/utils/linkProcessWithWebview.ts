import * as execa from 'execa'

import { WebviewManager } from '../WebviewManager'

import { splitReadableToLines } from './splitReadableToLines'


export async function linkProcessWithWebview(
	process: execa.ExecaChildProcess,
	viewManager: WebviewManager,
): Promise<void> {
	loop: for await (const line of splitReadableToLines(process.stdout!)) {
		if (line.startsWith('#!')) { // skip shebang
			continue
		}

		try {
			if (line.startsWith('{')) {
				const parsed = JSON.parse(line)

				if (parsed.type === 'write' && parsed.data === '=> $DUMP$\n') {
					continue
				}

				if (parsed.type === 'eof') {
					break loop
				}

				viewManager.send(parsed)
			} else {
				viewManager.send({
					type: 'raw',
					data: line,
				})
			}
		} catch (e) {
			viewManager.send({
				type: 'raw',
				data: line,
			})

			console.error(e)
		}
	}
}
