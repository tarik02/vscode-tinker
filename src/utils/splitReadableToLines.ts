import { Readable } from 'stream'


export async function *splitReadableToLines(readable: Readable): AsyncGenerator<string> {
	readable.setEncoding('utf-8')

	let data = ''
	for await (const chunk of readable) {
		data += chunk

		const chunks = data.split('\n')

		for (const result of chunks.slice(0, -1)) {
			yield result
		}

		data = chunks[chunks.length - 1]
	}

	if (data !== '') {
		yield data
	}
}
