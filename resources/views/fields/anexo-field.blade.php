<x-dynamic-component :component="$getFieldWrapperView()" :field="$field">
    <div
            class="space-y-2"
            x-data="sedurAnexoFieldInit({
                statePath: '{{ $getStatePath() }}',
                directory: '{{ $getDirectory() }}',
                steps: @js($getWorkflowStepsMeta())
            })">
        <input type="file"
               accept="{{ implode(',', $getMimeTypes()) }}"
               x-ref="fileInput"
               class="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gray-200 dark:file:bg-gray-800 file:cursor-pointer"
               @change="handleFile($event.target.files[0])"/>

        <template x-if="busy">
            <div class="w-full bg-gray-200 dark:bg-gray-800 rounded-xl overflow-hidden">
                <div class="h-2 bg-blue-600 transition-all" :style="'width:'+progress+'%'"></div>
            </div>
        </template>

        <template x-if="error">
            <p class="text-sm text-red-600" x-text="error"></p>
        </template>

        <template x-if="state">
            <p class="text-xs text-gray-500">
                Arquivo armazenado: <span class="font-mono" x-text="state"></span>
            </p>
        </template>
    </div>
</x-dynamic-component>