<?php

namespace Sedur\FilamentAnexoField\Concerns;

use Filament\Support\Components\Attributes\ExposedLivewireMethod;
use Filament\Support\Components\Component;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;

// HasAnexoField.php

trait HasAnexoField
{

    #[ExposedLivewireMethod]
    public function runStepIndex(string $statePath, string $arquivo, int $i, array $contexto = []): array
    {
        $field = $this->findFormComponentByStatePath($statePath);
        if (!$field || !method_exists($field, 'getWorkflowSteps')) {
            return ['success' => false, 'catch' => ['titulo' => 'Erro', 'descricao' => 'Field não encontrado.']];
        }

        $steps = $field->getWorkflowSteps();
        $cb = $steps[$i]['callback'] ?? null;

        try {
            if (is_callable($cb)) {
                $contexto = $cb($arquivo, $contexto);
            }
            return ['success' => true, 'contexto' => $contexto];
        } catch (\Throwable $e) {
            return ['success' => false, 'catch' => ['titulo' => 'Erro', 'descricao' => $e->getMessage()]];
        }
    }

    /** busca recursiva no form */
    protected function findFormComponentByStatePath(string $statePath): ?Component
    {
        $walk = function ($components) use (&$walk, $statePath) {
            foreach ($components as $c) {
                if (method_exists($c, 'getStatePath') && $c->getStatePath() === $statePath) return $c;
                if (method_exists($c, 'getChildComponentContainers')) {
                    foreach ($c->getChildComponentContainers() as $child) {
                        $found = $walk($child->getComponents());
                        if ($found) return $found;
                    }
                }
            }
            return null;
        };

        // padrão: nome do form = 'form'
        return $walk($this->form->getComponents());
    }

    #[ExposedLivewireMethod]
    public function doUpload(string $uploadedFilename, string $dir = 'anexos'): string
    {
        $file = TemporaryUploadedFile::createFromLivewire($uploadedFilename);

        $path = $file->store($dir, 'kubedata');

        $this->form->fill([$this->getName() => $path]);

        return $path;
    }

    #[ExposedLivewireMethod]
    public function runStep(string $arquivo, array $step, array $contexto = []): array
    {
        try {
            $callback = $step['callback'] ?? null;

            if (is_callable($callback)) {
                $contexto = $callback($arquivo, $contexto);
            }

            return ['success' => true, 'contexto' => $contexto];
        } catch (\Throwable $e) {
            return [
                'success' => false,
                'catch' => [
                    'titulo' => 'Erro',
                    'descricao' => $e->getMessage(),
                ],
            ];
        }
    }
}
