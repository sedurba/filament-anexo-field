@php $stepsMeta = $getWorkflowStepsMeta(); @endphp

<x-dynamic-component :component="$getFieldWrapperView()" :field="$field">
    <div
        x-data='{
      state: $wire.entangle("{{ $getStatePath() }}"),
      busy: false, error: null, progress: 0,

      async handleFile(file) {
    if (!file) return;
    this.busy = true; this.error = null; this.progress = 0;

    try {
        // === abre swal antes do upload ===
        Swal.fire({
            text: "Salvando arquivo no servidor...",
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading(),
        });

        await $wire.upload(
            "data.{{ $getStatePath() }}",
            file,
            async (uploadedFilename) => {
                const path = await $wire.call("doUpload", uploadedFilename, "{{ $getDirectory() }}");
                this.state = path;

                let finalizado = false;
                let contexto = {};
                const steps = @json($getWorkflowStepsMeta());

                for (let i = 0; i < steps.length; i++) {
                    const step = steps[i];

                    // atualiza modal pro step atual
                    Swal.update({ text: step.titulo });
                    Swal.showLoading();

                    let tipTimer = null;
                    if (step.timeout) {
                        tipTimer = setTimeout(() => {
                            const msg = document.createElement("div");
                            msg.classList.add("text-xs","text-gray-500","mt-2");
                            msg.innerText = "Isso está demorando mais do que o esperado, ainda processando...";
                            Swal.getHtmlContainer().appendChild(msg);
                        }, step.timeout);
                    }

                    const res = await $wire.call("runStepIndex", "{{ $getStatePath() }}", path, step.i, contexto);

                    if (tipTimer) clearTimeout(tipTimer);

                    if (!res.success) {
                    Swal.hideLoading()
                        await Swal.update({
                            icon: "error",
                            title: res.catch?.titulo ?? "Erro",
                            text: res.catch?.descricao ?? "Falha no processamento",
                            showConfirmButton: true,
                        });

                        throw new Error(res.catch?.descricao ?? "Erro no step");
                    }
console.log((res.contexto.finalizar ?? false) == true);
                    if((res.contexto.finalizar ?? false) == true){
                        finalizado = true;
                        Swal.hideLoading()
                        await Swal.update({
                            icon: "success",
                            title: "Concluído",
                            text: "Workflow finalizado com sucesso",
                            showConfirmButton: true,
                        });
                    }

                    contexto = res.contexto;
                }

            if(finalizado == false){
                Swal.close();
                }
            },
            (err) => { this.error = "Falha no upload"; console.error(err); Swal.close(); },
            (event) => {
                if (event.lengthComputable) {
                    this.progress = Math.round((event.loaded / event.total) * 100);
                }
            }
        );
    } catch (e) {
        console.error(e);
        this.error = e.message;
        Swal.close();
    } finally {
        this.busy = false;
    }
}}'
        class="space-y-2"
    >
        <input type="file" accept="{{ implode(',', $getMimeTypes()) }}" class="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gray-200 dark:file:bg-gray-800 file:cursor-pointer" @change="handleFile($event.target.files[0])" />

        <template x-if="busy">
            <div class="w-full bg-gray-200 dark:bg-gray-800 rounded-xl overflow-hidden">
                <div class="h-2 bg-blue-600 transition-all" :style="'width:'+progress+'%'"></div>
            </div>
        </template>

        <template x-if="error"><p class="text-sm text-red-600" x-text="error"></p></template>

        <template x-if="state">
            <p class="text-xs text-gray-500">Arquivo armazenado: <span class="font-mono" x-text="state"></span></p>
        </template>
    </div>
</x-dynamic-component>
