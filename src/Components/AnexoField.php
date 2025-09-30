<?php

namespace Sedur\FilamentAnexoField\Components;

use Closure;
use Filament\Forms\Components\Field;
use Sedur\FilamentAnexoField\Exceptions\WorkflowFailedException;

class AnexoField extends Field
{
    protected string $view = 'filament-anexo::fields.anexo-field';

    protected Closure|array $mimeTypes;
    protected Closure|string|null $directory;
    protected Closure|int|null $size = null;
    protected Closure|bool $attach = true;

    protected $uploadCallback;
    protected Closure|array $workflowSteps = [];
    protected $catchCallback;

    protected function setUp(): void
    {
        parent::setUp();

        $this
            ->directory(fn() => null)
            ->mimeTypes(fn() => ['application/pdf'])
            ->rules(fn() => [])
            ->size(fn() => 1048)
            ->attach(fn() => true)
            ->catch(function ($arquivo, $contexto, $codigoErro) {
                return [
                    'titulo' => 'Erro',
                    'descricao' => 'Falha ao processar'
                ];
            });
    }

    // === Setters ===
    public function mimeTypes(Closure|array $mimeTypes): static
    {
        $this->mimeTypes = $mimeTypes;
        return $this;
    }

    public function directory(Closure|string $directory): static
    {
        $this->directory = $directory;
        return $this;
    }

    public function size(Closure|int $size): static
    {
        $this->size = $size;
        return $this;
    }

    public function attach(Closure|bool $attach): static
    {
        $this->attach = $attach;
        return $this;
    }

    public function upload(Closure $callback): static
    {
        $this->uploadCallback = $callback;
        return $this;
    }

    public function workflow(Closure|array $steps): static
    {
        $this->workflowSteps = $steps;

        return $this;
    }

    public function catch(Closure $callback): static
    {
        $this->catchCallback = $callback;
        return $this;
    }

    // === Helpers ===
    public function getMimeTypes(): array
    {
        return is_callable($this->mimeTypes) ? ($this->mimeTypes)() : ($this->mimeTypes ?? []);
    }

    public function getDirectory(): ?string
    {
        return is_callable($this->directory) ? ($this->directory)() : $this->directory;
    }

    public function getSize(): int
    {
        return is_callable($this->size) ? ($this->size)() : ($this->size ?? 2048);
    }

    public function getAttach(): bool
    {
        return is_callable($this->attach) ? ($this->attach)() : $this->attach;
    }

    public function getWorkflowSteps(): array
    {
        return $this->evaluate($this->workflowSteps);
    }

    public function getCatchCallback(): ?Closure
    {
        return $this->catchCallback;
    }

    public static function step(string $titulo, Closure $callback, int $timeoutMs = null): array
    {
        return [
            'titulo' => $titulo,
            'callback' => $callback,
            'timeout' => $timeoutMs
        ];
    }

    public static function workflowFailed(string $arquivo, array $contexto, int $codigoErro): never
    {
        throw new WorkflowFailedException($arquivo, $contexto, $codigoErro);
    }

    // AnexoField.php
    public function getWorkflowStepsMeta(): array
    {
        $i = -1;
        return collect($this->getWorkflowSteps())->map(function ($s) use (&$i) {
            $i++;
            return [
                'i' => $i,
                'titulo' => $s['titulo'] ?? 'Processando',
                'timeout' => $s['timeout'] ?? null,
                'swal' => $s['swal'] ?? [],
            ];
        })->values()->all();
    }
}
