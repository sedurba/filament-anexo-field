<?php

namespace Sedur\FilamentAnexoField\Concerns;

use Filament\Forms\Components\Field;
use Filament\Schemas\Schema;
use Filament\Support\Components\Attributes\ExposedLivewireMethod;
use Filament\Support\Components\Component;
use Illuminate\Support\Arr;
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;
use Sedur\FilamentAnexoField\Components\AnexoField;

/**
 * @property Schema $form
 *
 * @mixin Field
 */
trait HasAnexoField
{
    #[ExposedLivewireMethod]
    public function sedurAnexoRunStepIndex(string $statePath, string $arquivo, int $i, array $contexto = []): array
    {
        $field = $this->sedurAnexoFindFormComponentByStatePath($statePath);

        if (!$field || !method_exists($field, 'getWorkflowSteps')) {
            return [
                'success' => false,
                'catch' => [
                    'titulo' => 'Erro',
                    'descricao' => 'Field não encontrado.'
                ]
            ];
        }

        $steps = $field->getWorkflowSteps();

        $cb = $steps[$i]['callback'] ?? null;

        try {
            if (is_callable($cb)) {
                $contexto = $cb(TemporaryUploadedFile::createFromLivewire($arquivo), $contexto);
            }

            return [
                'success' => true,
                'contexto' => $contexto
            ];

        } catch (\Throwable $e) {

            if ($field instanceof AnexoField && method_exists($field, 'getCatchCallback')) {
                $catchResponse = $field->getCatchCallback();

                if (Arr::has($catchResponse, ['titulo', 'descricao'])) {
                    return $catchResponse;
                }
            }

            return [
                'success' => false,
                'catch' => [
                    'titulo' => 'Erro',
                    'descricao' => 'Falha ao processar arquivo.'
                ]
            ];

        }
    }

    protected function sedurAnexoFindFormComponentByStatePath(string $statePath): ?Component
    {
        $walk = function ($components) use (&$walk, $statePath) {
            foreach ($components as $c) {
                if (method_exists($c, 'getStatePath') && $c->getStatePath() === $statePath) {
                    return $c;
                }

                if (method_exists($c, 'getChildComponentContainers')) {
                    foreach ($c->getChildComponentContainers() as $child) {
                        $found = $walk($child->getComponents());

                        if ($found) {
                            return $found;
                        }
                    }
                }
            }

            return null;
        };

        return $walk($this->form->getComponents());
    }
}
