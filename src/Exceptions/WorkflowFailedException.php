<?php

namespace Sedur\FilamentAnexoField\Exceptions;

use Exception;

class WorkflowFailedException extends Exception
{
    public function __construct(
        private readonly string $arquivo,
        private readonly array  $contexto,
        private readonly int    $codigoErro
    )
    {
        parent::__construct("Workflow Failed.", $codigoErro);
    }

    public function getArquivo(): string
    {
        return $this->arquivo;
    }

    public function getContexto(): array
    {
        return $this->contexto;
    }

    public function getCodigoErro(): int
    {
        return $this->codigoErro;
    }
}