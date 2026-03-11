/**
 * Alpine Component para o campo AnexoField.
 *
 * Esse componente é carregado pelo Filament usando `x-load-src`.
 * Ele encapsula toda a lógica de:
 *
 * 1) Upload do arquivo via Livewire
 * 2) Exibição de progresso do upload no SweetAlert
 * 3) Fechamento do modal de upload ao mudar de etapa
 * 4) Abertura de um novo modal limpo para os steps do workflow
 * 5) Execução de um workflow de steps no backend
 * 6) Tratamento de erros e feedback visual para o usuário
 */

window.sedurAnexoFieldInit = function ({ statePath, directory, steps }) {
    return {
        /**
         * Caminho final do arquivo salvo no storage.
         */
        state: null,

        /**
         * Indica se está processando algo.
         */
        busy: false,

        /**
         * Mensagem de erro, se houver.
         */
        error: null,

        /**
         * Progresso atual do upload.
         */
        progress: 0,

        /**
         * Indica se o Swal atual é o modal de upload com progresso.
         */
        uploadSwalOpen: false,

        /**
         * Handler principal chamado quando um arquivo é selecionado.
         */
        async handleFile(file) {
            if (!file) return

            this.busy = true
            this.error = null
            this.progress = 0
            this.uploadSwalOpen = false

            try {
                /**
                 * Abre o modal inicial de upload com barra de progresso.
                 */
                this.showUploadLoading('Salvando arquivo no servidor...')

                /**
                 * Gera uma chave única para o upload.
                 */
                let fileKey = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11)
                    .replace(/[018]/g, (c) => (
                        c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
                    ).toString(16))

                /**
                 * Upload do arquivo via Livewire.
                 */
                await this.$wire.upload(
                    `${statePath}.${fileKey}`,
                    file,

                    /**
                     * Sucesso no upload.
                     */
                    async (uploadedFilename) => {
                        console.log('Upload concluído:', uploadedFilename)

                        /**
                         * Garante que o usuário veja 100% antes de trocar de modal.
                         */
                        this.setProgress(100)

                        /**
                         * Fecha o modal de upload e inicia o workflow.
                         */
                        await this.runSteps(uploadedFilename)
                    },

                    /**
                     * Erro no upload.
                     */
                    (err) => {
                        this.error = 'Falha no upload'
                        console.error(err)

                        this.uploadSwalOpen = false
                        window.Swal.close()
                    },

                    /**
                     * Atualização de progresso do upload.
                     */
                    (event) => {
                        if (event.lengthComputable) {
                            this.progress = Math.round(
                                (event.loaded / event.total) * 100
                            )

                            this.setProgress(this.progress)
                        }
                    },
                )
            } catch (e) {
                console.error(e)
                this.error = e.message
                this.uploadSwalOpen = false
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
            let workflowModalOpened = false

            for (const step of steps) {
                console.log('Processando:', step.titulo)

                /**
                 * Na primeira etapa, fechamos o Swal do upload
                 * e abrimos um novo Swal totalmente limpo.
                 */
                if (!workflowModalOpened) {
                    await this.openWorkflowLoading(step.titulo, step.swal)
                    workflowModalOpened = true
                } else {
                    await this.updateWorkflowLoading(step.titulo, step.swal)
                }

                /**
                 * Timer opcional para aviso de demora.
                 */
                let tipTimer = null

                if (step.timeout) {
                    tipTimer = setTimeout(() => {
                        const container = window.Swal.getHtmlContainer()

                        if (!container) return

                        const msg = document.createElement('div')
                        msg.classList.add('text-xs', 'text-gray-500', 'mt-2')
                        msg.innerText =
                            'Isso está demorando mais do que o esperado, ainda processando...'

                        container.appendChild(msg)
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

                console.log('Resultado do step:', res)

                if (tipTimer) clearTimeout(tipTimer)

                /**
                 * Se falhou, mostra erro.
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
                 * Atualiza contexto.
                 */
                contexto = res.contexto

                /**
                 * Se o backend sinalizou finalização.
                 */
                if (res.contexto.finalizar === true) {
                    this.showSuccess()
                    finalizado = true
                    break
                }
            }

            /**
             * Caso nenhum step finalize explicitamente.
             */
            if (!finalizado) {
                window.Swal.close()
            }

            /**
             * Se backend solicitou uma action do Filament.
             */
            if (
                contexto.mount_action &&
                contexto.mount_action.key &&
                contexto.mount_action.arguments
            ) {
                console.log('Executando action:', contexto.mount_action.key)

                this.$wire.call(
                    'mountAction',
                    contexto.mount_action.key,
                    contexto.mount_action.arguments
                ).catch((err) => {
                    this.showError('Falha ao executar ação', err?.message)
                })
            }

            return contexto
        },

        /**
         * Abre o modal de upload com barra de progresso.
         */
        showUploadLoading(texto) {
            this.uploadSwalOpen = true

            window.Swal.fire({
                title: texto,
                html: `
                    <div class="w-full mt-2">
                        <div id="swal-upload-text" style="margin-bottom:8px; font-size:14px;">
                            0%
                        </div>

                        <div style="
                            width:100%;
                            height:10px;
                            background:#e5e7eb;
                            border-radius:999px;
                            overflow:hidden;
                        ">
                            <div
                                id="swal-upload-bar"
                                style="
                                    width:0%;
                                    height:100%;
                                    background:#22c55e;
                                    transition:width .2s ease;
                                "
                            ></div>
                        </div>
                    </div>
                `,
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => window.Swal.showLoading(),
            })
        },

        /**
         * Atualiza a barra e o texto de progresso.
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
         * Fecha o Swal de upload e abre um novo Swal limpo para workflow.
         *
         * Esse é o ponto que realmente garante que a barra de progresso suma.
         */
        async openWorkflowLoading(texto, opts = {}) {
            if (this.uploadSwalOpen) {
                window.Swal.close()

                /**
                 * Pequena pausa para garantir desmontagem do DOM do Swal anterior.
                 */
                await new Promise((resolve) => setTimeout(resolve, 50))
            }

            this.uploadSwalOpen = false

            window.Swal.fire({
                ...opts,
                title: texto,
                html: opts.html ?? null,
                text: opts.text ?? null,
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                didOpen: () => window.Swal.showLoading(),
            })
        },

        /**
         * Atualiza o Swal já aberto durante os steps.
         */
        async updateWorkflowLoading(texto, opts = {}) {
            await window.Swal.update({
                ...opts,
                title: texto,
                html: opts.html ?? null,
                text: opts.text ?? null,
                showConfirmButton: false,
            })

            window.Swal.showLoading()
        },

        /**
         * Exibe erro no SweetAlert.
         */
        async showError(titulo, descricao, botao, footer) {
            this.uploadSwalOpen = false

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
         * Limpa o campo e reseta estado interno.
         */
        resetInput() {
            this.state = null
            this.error = null
            this.progress = 0
            this.uploadSwalOpen = false

            if (this.$refs.fileInput) {
                this.$refs.fileInput.value = null
            }
        },

        /**
         * Exibe sucesso no SweetAlert.
         */
        showSuccess() {
            this.uploadSwalOpen = false

            window.Swal.hideLoading()

            window.Swal.update({
                icon: 'success',
                title: 'Concluído',
                text: 'Workflow finalizado com sucesso',
                html: null,
                showConfirmButton: true,
            })
        },
    }
}
