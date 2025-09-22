/**
 * Alpine Component para o campo AnexoField.
 *
 * Esse componente é carregado pelo Filament usando `x-load-src`.
 * Ele encapsula toda a lógica de upload + execução do workflow.
 */

window.sedurAnexoFieldInit = function ({statePath, directory, steps}) {
    return {
        state: null,     // caminho final do arquivo no storage
        busy: false,     // indica se está processando
        error: null,     // mensagem de erro (se houver)
        progress: 0,     // progresso do upload (%)

        /**
         * Handler principal chamado quando um arquivo é selecionado.
         */
        async handleFile(file) {
            if (!file) return

            this.busy = true
            this.error = null
            this.progress = 0

            try {
                // === Modal inicial antes do upload ===
                this.showLoading('Salvando arquivo no servidor...')

                let fileKey = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11)
                    .replace(/[018]/g, (c) => (
                        c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
                    ).toString(16))

                // Upload com Livewire
                await this.$wire.upload(
                    `${statePath}.${fileKey}`,
                    file,

                    // Sucesso no upload
                    async (uploadedFilename) => {
                        console.log(uploadedFilename)

                        // // Salva o arquivo no storage configurado
                        // const path = await this.$wire.call(
                        //     'sedurAnexoDoUpload',
                        //     uploadedFilename,
                        //     directory,
                        // )
                        //
                        // console.log(path);

                        // this.state = path
                     //   await this.$wire.set(statePath, path)

                        // Roda os steps do workflow
                        await this.runSteps(uploadedFilename)
                    },

                    // Erro no upload
                    (err) => {
                        this.error = 'Falha no upload'
                        console.error(err)
                        window.Swal.close()
                    },

                    // Progresso
                    (event) => {
                        console.log(event)
                        if (event.lengthComputable) {
                            this.progress = Math.round(
                                (event.loaded / event.total) * 100,
                            )
                        }
                    },
                )
            } catch (e) {
                console.error(e)
                this.error = e.message
                window.Swal.close()
            } finally {
                this.busy = false
            }
        },

        /**
         * Executa os steps do workflow no backend via Livewire.
         */
        async runSteps(path) {
            let contexto = {}
            let finalizado = false

            for (const step of steps) {
                console.log("Processando: " + step.titulo);

                await this.updateLoading(step.titulo, step.swal)

                // Timer opcional para mostrar dica de demora
                let tipTimer = null
                if (step.timeout) {
                    tipTimer = setTimeout(() => {
                        const msg = document.createElement('div')
                        msg.classList.add('text-xs', 'text-gray-500', 'mt-2')
                        msg.innerText =
                            'Isso está demorando mais do que o esperado, ainda processando...'
                        window.Swal.getHtmlContainer().appendChild(msg)
                    }, step.timeout)
                }

                // Chama o PHP para rodar o callback do step
                const res = await this.$wire.call(
                    'sedurAnexoRunStepIndex',
                    statePath,
                    path,
                    step.i,
                    contexto,
                )

                console.log("Processando resultado: ", res);

                if (tipTimer) clearTimeout(tipTimer)

                if (!res.success) {
                    console.log("Sem sucesso no resultado.");
                    await this.showError(
                        res.catch?.titulo,
                        res.catch?.descricao,
                        res.catch?.botao,
                        res.catch?.footer
                    )
                    throw new Error(res.catch?.descricao ?? 'Erro no step')
                }

                if (res.contexto.finalizar === true) {
                    console.log("Finalização requisitada.");
                    this.showSuccess()
                    finalizado = true
                }

                contexto = res.contexto

                if (finalizado) {
                    console.log("Processo finalizado.");
                    break;
                }
            }

            if (!finalizado) {
                console.log("Não recebeu mensagem para finalizar, então vamos forçar pois senão fica travada.");
                window.Swal.close()
            }

            if (contexto.mount_action && contexto.mount_action.key && contexto.mount_action.arguments) {
                console.log("Action solicitada: " + contexto.mount_action.key);
                this.$wire.call('mountAction', contexto.mount_action.key, contexto.mount_action.arguments)
                    .catch((err) => this.showError("Falha ao executar ação", res.message));
                console.log("Action finalizada: " + contexto.mount_action.key);
            } else {
                console.log("Action não acionada.")
            }

            return contexto
        },

        /**
         * === Helpers de UI (Swal) ===
         */
        showLoading(texto) {
            window.Swal.fire({
                text: texto,
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => window.Swal.showLoading(),
            })
        },

        async updateLoading(texto, opts) {
            opts.text = texto;
            console.log("Swal Options: " + opts)
            await window.Swal.update(opts);
            await window.Swal.showLoading();
        },

        async showError(titulo, descricao, botao, footer) {
            window.Swal.hideLoading()
            await window.Swal.update({
                imageUrl: null,
                imageWidth: null,
                imageHeight: null,
                icon: 'error',
                title: titulo ?? 'Erro',
                html: descricao ?? 'Falha no processamento',
                footer: footer ?? null,
                confirmButtonText: botao ?? 'Fechar',
                showConfirmButton: true,
            })
        },

        showSuccess() {
            window.Swal.hideLoading()
            window.Swal.update({
                icon: 'success',
                title: 'Concluído',
                text: 'Workflow finalizado com sucesso',
                showConfirmButton: true,
            })
        },
    }
}