/**
 * Alpine Component para o campo AnexoField.
 *
 * Esse componente é carregado pelo Filament usando `x-load-src`.
 * Ele encapsula toda a lógica de:
 *
 * 1) Upload do arquivo via Livewire
 * 2) Exibição de progresso do upload no SweetAlert
 * 3) Remoção do progresso ao entrar nas etapas do workflow
 * 4) Execução de um workflow de steps no backend
 * 5) Tratamento de erros e feedback visual para o usuário
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
         * Controla se o Swal atual está exibindo UI de progresso.
         */
        showingProgress: false,

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
                 * Abre o modal inicial com barra de progresso.
                 */
                this.showLoading('Salvando arquivo no servidor...', true)

                /**
                 * Gera uma chave única para o upload.
                 */
                let fileKey = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11)
                    .replace(/[018]/g, (c) => (
                        c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
                    ).toString(16))

                /**
                 * Realiza upload via Livewire.
                 */
                await this.$wire.upload(
                    `${statePath}.${fileKey}`,
                    file,

                    /**
                     * Callback de sucesso do upload.
                     */
                    async (uploadedFilename) => {
                        console.log('Upload concluído:', uploadedFilename)

                        /**
                         * Garante 100% antes de ir para os steps.
                         */
                        this.setProgress(100)

                        /**
                         * Inicia o workflow backend.
                         */
                        await this.runSteps(uploadedFilename)
                    },

                    /**
                     * Callback de erro do upload.
                     */
                    (err) => {
                        this.error = 'Falha no upload'
                        console.error(err)
                        window.Swal.close()
                    },

                    /**
                     * Callback de progresso do upload.
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
                console.log('Processando:', step.titulo)

                /**
                 * Ao mudar para uma etapa, remove a UI de progresso
                 * e troca o modal para exibir apenas o conteúdo do step.
                 */
                await this.updateLoading(step.titulo, step.swal)

                /**
                 * Timer opcional para exibir aviso de demora.
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
                 * Se o step falhou, exibe erro.
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
                 * Se backend pediu finalização.
                 */
                if (res.contexto.finalizar === true) {
                    this.showSuccess()
                    finalizado = true
                }

                /**
                 * Atualiza contexto.
                 */
                contexto = res.contexto

                if (finalizado) {
                    break
                }
            }

            /**
             * Caso nenhum step finalize explicitamente, fecha o modal.
             */
            if (!finalizado) {
                window.Swal.close()
            }

            /**
             * Se backend pediu execução de action do Filament.
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
         * Exibe um Swal de loading.
         *
         * Quando withProgress = true, renderiza barra + percentual.
         */
        showLoading(texto, withProgress = false) {
            this.showingProgress = withProgress

            const html = withProgress
                ? `
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
         * Atualiza o progresso no Swal durante o upload.
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
         * Atualiza o modal quando entra em uma nova etapa.
         *
         * Aqui removemos explicitamente a UI de progresso,
         * definindo html como null.
         */
        async updateLoading(texto, opts = {}) {
            this.showingProgress = false

            await window.Swal.update({
                ...opts,
                title: texto,
                html: null,
                text: opts.text ?? null,
                showConfirmButton: false,
            })

            window.Swal.showLoading()
        },

        /**
         * Exibe erro no SweetAlert.
         */
        async showError(titulo, descricao, botao, footer) {
            this.showingProgress = false

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
            this.showingProgress = false

            if (this.$refs.fileInput) {
                this.$refs.fileInput.value = null
            }
        },

        /**
         * Exibe modal de sucesso.
         */
        showSuccess() {
            this.showingProgress = false

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
