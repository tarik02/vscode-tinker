import * as execa from 'execa'

import { ProcessManagerDelegate } from './ProcessManagerDelegate'


export class ProcessManager {
	private process: execa.ExecaChildProcess | undefined
	private delegate: ProcessManagerDelegate

	public get isRunning(): boolean {
		return this.process !== undefined
	}

	public constructor(delegate: ProcessManagerDelegate) {
		this.delegate = delegate
	}

	public start(createProcess: () => execa.ExecaChildProcess): void {
		if (this.process !== undefined) {
			throw new Error('Process is already running')
		}

		try {
			const process = createProcess()
			this.process = process

			this.delegate.onStarted(process)

			process
				.then(() => {
					this.delegate.onStopped('exit', process.exitCode ?? undefined, undefined)
				})
				.catch(e => {
					if (process.killed) {
						this.delegate.onStopped('killed', process.exitCode ?? undefined, e)
					} else if (this.process === process) {
						this.delegate.onStopped('exit', process.exitCode ?? undefined, e)
					} else {
						this.delegate.onStopped('error', process.exitCode ?? undefined, e)
					}

					process.kill()
				})
				.finally(() => {
					if (this.process === process) {
						this.process = undefined
					}
				})
		} catch (e) {
			console.error(e)
			this.delegate.onStopped('error', undefined, e)

			this.process = undefined
			throw e
		}
	}

	public async stop(): Promise<void> {
		if (this.process === undefined) {
			throw new Error('Dump server is not running')
		}

		const process = this.process
		this.process = undefined

		process.kill()
	}
}
