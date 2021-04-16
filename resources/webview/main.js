const vscode = acquireVsCodeApi()

const globalState = Vue.reactive(vscode.getState() || {})

Vue.watch(() => globalState, newState => vscode.setState(newState), { deep: true })

let isInitialized = false
Vue.watch(() => globalState.shared, shared => {
	if (shared && ! isInitialized) {
		eval(shared.script)
		const $style = document.createElement('style')
		$style.innerHTML = shared.style
		document.head.appendChild($style)
		isInitialized = true
	}
}, { immediate: true })

const addItem = (type, item) => {
	if (!globalState.items) {
		globalState.items = []
	}

	if (!globalState.keysCounter) {
		globalState.keysCounter = 0
	}

	globalState.items.push({
		...item,
		type,
		key: ++globalState.keysCounter,
	})
}

const ContextHeader = {
	template: `
		<div
			v-if="value"
			class="context-header"
		>
			<div
				v-if="value.request"
				class="context-header__request"
			>
				<div
					class="context-header__request__method"
					v-text="value.request.method"
				/>
				<a
					class="context-header__request__uri external-link"
					:href="value.request.uri"
					v-text="value.request.uri"
				/>
			</div>

			<a
				v-if="value.source"
				:href="value.source.file"
				class="context-header__source external-link"
				@click.prevent="onClickOpenFile"
			>
				<div
					class="context-header__file"
					v-text="value.source.file_relative"
				/>
				:
				<div
					class="context-header__file-location"
					v-text="value.source.line"
				/>
			</div>
		</div>
	`,
	props: {
		value: {
			type: Object,
			required: true,
		},
	},
	setup: props => {
		const { value } = Vue.toRefs(props)

		return {
			value,

			onClickOpenFile() {
				vscode.postMessage({
					type: 'open',
					file: value.value.source.file,
					line: value.value.source.line,
				})
			},
		}
	},
}

const ServiceMessageItem = {
	template: `
	<div class="service-message-item">
		<div>{{ value.message }}</div>
	</div>
`,
	props: {
		value: {
			type: Object,
			required: true,
		},
	},
	setup: props => {
		const { value } = Vue.toRefs(props)

		return {
			value,
		}
	},
}

const MessageItem = {
	template: `
	<div class="message-item">
		<div>{{ value.message }}</div>
	</div>
`,
	props: {
		value: {
			type: Object,
			required: true,
		},
	},
	setup: props => {
		const { value } = Vue.toRefs(props)

		return {
			value,
		}
	},
}

const DumpItem = {
	components: {
		ContextHeader,
	},
	template: `
	<div class="dump-item">
		<context-header
			v-model="value.context"
			:value="value.context"
		/>
		<div v-html="value.html" />
	</div>
`,
	props: {
		value: {
			type: Object,
			required: true,
		},
	},
	setup: props => {
		const { value } = Vue.toRefs(props)

		Vue.onMounted(() => {
			eval(value.value.script)
		})

		return {
			value,
		}
	},
}

const ItemWrapper = {
	template: `
	<div
		class="app__items__item-wrapper"
		@click.middle.prevent="onClickDelete"
	>
		<div
			:class="'app__items__item-scope-' + (value.scope || 'default')"
			class="app__items__item-scope"
		/>
		<div
			class="app__items__item-wrapper__delete-button"
			@click.prevent="onClickDelete"
		>⌫</div>
		<slot />
	</div>
`,
	props: {
		value: {
			type: Object,
			required: true,
		},
	},
	emits: ['delete'],
	setup(props, { emit }) {
		const { value } = Vue.toRefs(props)

		return {
			value,

			onClickDelete: () => emit('delete'),
		}
	},
}

const ItemsEmpty = {
	template: `
	<div class="app__items-empty">
		It is empty :(
	</div>
`,
}

const AppHeader = {
	template: `
	<div class="app__header">
		<div class="app__header__status-text">
			<span class="key">Status: </span><span class="value" v-text="statusText" />
		</div>

		<div class="app__header__filler" />

		<button
			v-if="isAttached"
			class="app__header__button"
			style="margin-right: 10px;"
			@click="onClickStop"
		>Stop</button>

		<button
			class="app__header__button"
			@click="onClickClear"
		>Clear</button>
	</div>
`,
	emits: [
		'clear',
	],
	setup: (_props, { emit }) => {
		return {
			isAttached: Vue.computed(() => globalState.attached || false),
			statusText: Vue.computed(() => globalState.attached ? 'Running' : 'Not running'),

			onClickStop: () => {
				vscode.postMessage({
					type: 'stop',
				})
			},
			onClickClear: () => emit('clear'),
		}
	},
}

const App = {
	components: {
		ServiceMessageItem,
		MessageItem,
		DumpItem,
		ItemWrapper,
		ItemsEmpty,
		AppHeader,
	},
	template: `
	<app-header
		@clear="onClear"
	/>
	<items-empty v-if="items.length === 0" />
	<div
		v-else
		ref="$items"
		class="app__items"
		@scroll="onItemsScroll"
	>
		<item-wrapper
			v-for="item of items"
			:key="item.key"
			:value="item"
			@delete="onDelete(item)"
		>
			<component
				:is="getComponentForItem(item)"
				:value="item"
			/>
		</item-wrapper>
	</div>
`,
	setup: () => {
		const $items = Vue.ref(null)

		Vue.watch(
			() => globalState.items.length,
			async () => {
				if (! $items.value) {
					return
				}

				if ($items.value.scrollTop < $items.value.scrollHeight - $items.value.offsetHeight * 1.4) {
					return
				}

				await Vue.nextTick()

				if (! $items.value) {
					return
				}

				$items.value.scrollTop = $items.value.scrollHeight - $items.value.offsetHeight * 1.2
			},
		)

		Vue.onMounted(() => {
			if ($items.value) {
				$items.value.scrollTop = globalState.itemsScrollTop || 0
			}
		})

		return {
			$items,
			items: Vue.computed(() => globalState.items || []),

			getComponentForItem: item => item.type + '-item',

			onDelete: item => {
				const index = globalState.items.indexOf(item)
				if (index !== -1) {
					globalState.items.splice(index, 1)
				}
			},

			onClear: () => {
				globalState.items = []
			},

			onItemsScroll: () => {
				globalState.itemsScrollTop = $items.value.scrollTop
			},
		}
	},
}

Vue.createApp(App).mount('#app')

vscode.postMessage({
	type: 'ready',
})

window.addEventListener('message', async event => {
	const message = event.data

	switch (message.type) {
	case 'service':
		addItem('service-message', {
			scope: message.scope || 'service',
			message: message.message,
		})
		break

	case 'write':
	case 'raw':
		const text = (message.data || '').trim()
		if (text !== '') {
			addItem('message', {
				scope: message.scope || 'default',
				message: text,
			})
		}
		break

	case 'dump':
	case 'dump-from-server':
		const $item = document.createElement('div')
		$item.innerHTML = message.data

		const [
			$globalScript,
			$globalStyle,
			$pre,
			$script,
		] = Array.from($item.children)

		globalState.shared = {
			script: $globalScript.innerHTML,
			style: $globalStyle.innerHTML,
		}

		addItem('dump', {
			scope: message.scope || 'dump',
			id: $pre.id,
			html: $pre.outerHTML,
			script: $script.innerHTML,
			context: message.context,
		})
		break

	case 'set-attached':
		globalState.attached = true
		break

	case 'set-detached':
		globalState.attached = false
		break
	}
})
