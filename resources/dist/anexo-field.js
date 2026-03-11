/**
 * Alpine Component para o campo AnexoField.
 *
 * Esse componente é carregado pelo Filament usando `x-load-src`.
 * Ele encapsula toda a lógica de:
 *
 * 1) Upload do arquivo via Livewire
 * 2) Exibição de progresso do upload no SweetAlert
 * 3) Execução de um workflow de steps no backend
 * 4) Tratamento de erros e feedback visual para o usuário
 */

window.sedurAnexoFieldInit = function ({ statePath, directory, steps }) {
    return {

        /**
         * Caminho final do arquivo salvo no storage.
         */
        state: null,

        /**
         * Indica se o sistema está ocupado processando algo.
         */
        busy: false,

        /**
         * Mensagem de erro (caso ocorra).
         */
        error: null,

        /**
         * Porcentagem atual do upload.
         */
        progress: 0,


        /**
         * Handler principal chamado quando o usuário seleciona um arquivo.
         */
        async handleFile(file) {

            if (!file) return

            this.busy = true
            this.error = null
            this.progress = 0

            try {

                /**
                 * Abre o modal de loading com barra de progresso.
                 */
                this.showLoading('Salvando arquivo no servidor...', true)

                /**
                 * Gera uma chave única para o arquivo enviado.
                 * Isso evita colisões dentro do statePath do Livewire.
                 */
                let fileKey = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11)
                    .replace(/[018]/g, (c) => (
                        c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
                    ).toString(16))


                /**
                 * Upload do arquivo utilizando o sistema de upload do Livewire.
                 */
                await this.$wire.upload(

                    /**
                     * Caminho interno do Livewire.
                     */
                    `${statePath}.${fileKey}`,

                    /**
                     * Arquivo selecionado pelo usuário.
                     */
                    file,


                    /**
                     * Callback executado quando o upload termina com sucesso.
                     */
                    async (uploadedFilename) => {

                        console.log("Upload concluído:", uploadedFilename)

                        /**
                         * Garante que a barra chegue a 100%.
                         */
                        this.setProgress(100)

                        /**
                         * Após o upload, inicia o workflow de processamento.
                         */
                        await this.runSteps(uploadedFilename)
                    },


                    /**
                     * Callback executado se ocorrer erro durante upload.
                     */
                    (err) => {

                        this.error = 'Falha no upload'

                        console.error(err)

                        window.Swal.close()
                    },


                    /**
                     * Callback de progresso do upload.
                     * Atualiza a porcentagem no SweetAlert.
                     */
                    (event) => {

                        if (event.lengthComputable) {

                            this.progress = Math.round(
                                (event.loaded / event.total) * 100
                            )

                            /**
                             * Atualiza visualmente a barra e o texto.
                             */
                            this.setProgress(this.progress)
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
         *
         * Cada step pode:
         * - atualizar contexto
         * - falhar
         * - finalizar o processo
         * - disparar uma action do Filament
         */
        async runSteps(path) {

            let contexto = {}
            let finalizado = false

            for (const step of steps) {

                console.log("Processando:", step.titulo)

                /**
                 * Atualiza o modal com o texto do step atual.
                 */
                await this.updateLoading(step.titulo, step.swal)


                /**
                 * Timer opcional para avisar se estiver demorando.
                 */
                let tipTimer = null

                if (step.timeout) {

                    tipTimer = setTimeout(() => {

                        const msg = document.createElement('div')

                        msg.classList.add('text-xs', 'text-gray-500', 'mt-2')

                        msg.innerText =
                            'Isso está demorando mais do que o esperado, ainda processando...'

                        window.Swal.getHtmlContainer()?.appendChild(msg)

                    }, step.timeout)
                }


                /**
                 * Executa o step no backend.
                 */
                const res = await this.$wire.call(
                    'sedurAnexoRunStepIndex',
                    statePath,
                    path,
                    step.i,
                    contexto,
                )

                console.log("Resultado do step:", res)


                /**
                 * Cancela timer caso o step finalize antes.
                 */
                if (tipTimer) clearTimeout(tipTimer)


                /**
                 * Tratamento de erro do step.
                 */
                if (!res.success) {

                    await this.showError(
                        res.catch?.titulo,
                        res.catch?.descricao,
                        res.catch?.botao,
                        res.catch?.footer
                    )

                    throw new Error(res.catch?.descricao ?? 'Erro no step')
                }


                /**
                 * Caso o backend sinalize finalização do workflow.
                 */
                if (res.contexto.finalizar === true) {

                    this.showSuccess()

                    finalizado = true
                }

                /**
                 * Atualiza contexto local.
                 */
                contexto = res.contexto

                if (finalizado) break
            }


            /**
             * Caso nenhum step tenha finalizado explicitamente,
             * o modal é fechado manualmente.
             */
            if (!finalizado) {

                window.Swal.close()
            }


            /**
             * Se o backend solicitou executar uma Action do Filament.
             */
            if (
                contexto.mount_action &&
                contexto.mount_action.key &&
                contexto.mount_action.arguments
            ) {

                console.log("Executando action:", contexto.mount_action.key)

                this.$wire.call(
                    'mountAction',
                    contexto.mount_action.key,
                    contexto.mount_action.arguments
                ).catch((err) => {

                    this.showError("Falha ao executar ação", err?.message)
                })
            }

            return contexto
        },


        /**
         * Exibe modal de loading.
         *
         * Pode incluir barra de progresso opcional.
         */
        showLoading(texto, withProgress = false) {

            const html = withProgress
                ? `
                <div class="w-full mt-2">

                    <div id="swal-upload-text"
                         style="margin-bottom:8px;font-size:14px;">
                        0%
                    </div>

                    <div style="
                        width:100%;
                        height:10px;
                        background:#e5e7eb;
                        border-radius:999px;
                        overflow:hidden;
                    ">

                        <div id="swal-upload-bar"
                             style="
                                width:0%;
                                height:100%;
                                background:#22c55e;
                                transition:width .2s ease;
                             ">
                        </div>

                    </div>

                </div>
                `
                : null

            window.Swal.fire({

                title: texto,

                html,

                allowOutsideClick: false,
                allowEscapeKey: false,

                showConfirmButton: false,

                didOpen: () => window.Swal.showLoading(),
            })
        },


        /**
         * Atualiza progresso visual do upload.
         */
        setProgress(percent) {

            const textEl = document.getElementById('swal-upload-text')

            const barEl = document.getElementById('swal-upload-bar')

            if (textEl) {
                textEl.innerText = `${percent}%`
            }

            if (barEl) {
                barEl.style.width = `${percent}%`
            }
        },


        /**
         * Atualiza o modal durante execução dos steps.
         */
        async updateLoading(texto, opts = {}) {

            await window.Swal.update({
                ...opts,
                title: texto,
            })

            window.Swal.showLoading()
        },


        /**
         * Exibe erro no SweetAlert.
         */
        async showError(titulo, descricao, botao, footer) {

            window.Swal.hideLoading()

            await window.Swal.update({

                icon: 'error',

                title: titulo ?? 'Erro',

                html: descricao ?? 'Falha no processamento',

                footer: footer ?? null,

                confirmButtonText: botao ?? 'Fechar',

                showConfirmButton: true,
            })

            this.resetInput()
        },


        /**
         * Limpa o campo de upload no navegador.
         */
        resetInput() {

            this.state = null

            this.error = null

            this.progress = 0

            if (this.$refs.fileInput) {

                this.$refs.fileInput.value = null
            }
        },


        /**
         * Exibe modal de sucesso.
         */
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
