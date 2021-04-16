import * as execa from 'execa'


type StopReason =
	| 'exit'
	| 'killed'
	| 'error'

export interface ProcessManagerDelegate {
	onStarted(process: execa.ExecaChildProcess): void

	onStopped(reason: StopReason, code: number | undefined, error: Error | undefined): void
}
