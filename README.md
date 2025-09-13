# Filament Anexo Field

[![Latest Version on Packagist](https://img.shields.io/packagist/v/sedur/filament-anexo-field.svg?style=flat-square)](https://packagist.org/packages/sedur/filament-anexo-field)
[![Total Downloads](https://img.shields.io/packagist/dt/sedur/filament-anexo-field.svg?style=flat-square)](https://packagist.org/packages/sedur/filament-anexo-field)

Um campo customizado para [FilamentPHP](https://filamentphp.com/) que permite upload de anexos com **workflow de múltiplos passos** e feedback em tempo real usando **SweetAlert2**.

---

## 📋 Requerimentos

- [Laravel 11+](https://laravel.com)
- [Filament 4.x](https://filamentphp.com)
- PHP 8.2 ou superior
- [Livewire 3.x](https://livewire.laravel.com)
- [SweetAlert2](https://sweetalert2.github.io/) instalado via NPM:

```bash
npm install sweetalert2
```

---

## 📦 Instalação

Via composer (Packagist):

```bash
composer require sedur/filament-anexo-field
```

---

## ⚙️ Configuração

O Service Provider é registrado automaticamente pelo Laravel.  

### Publicar configuração

```bash
php artisan vendor:publish --tag="sedur::filament-anexo-field-config"
```

Arquivo publicado: `config/sedur-anexo-field.php`

```php
return [
    // Disco de upload usado pelo Storage
    'upload_disk' => env('SEDUR_ANEXO_FIELD_DISK', env('FILESYSTEM_DISK', 'public')),
];
```

### Publicar views (se quiser sobrescrever)

```bash
php artisan vendor:publish --tag="sedur::filament-anexo-field-views"
```

---

## 🚀 Uso

### 1. Adicione o trait na Page ou Livewire Form
```php
use Sedur\FilamentAnexoField\Concerns\HasAnexoField;

class DocumentoCreate extends CreateRecord
{
    use HasAnexoField;
}
```

### 2. Adicione o campo no schema do formulário
```php
use Sedur\FilamentAnexoField\Components\AnexoField;

AnexoField::make('campo_formulario')
    ->directory(fn() => 'exemplo/art')
    ->workflow([
        AnexoField::step('Preparando documento', function ($arquivo, $contexto) {
            sleep(1);
            $contexto['step1'] = true;
            return $contexto;
        }),
        AnexoField::step('Analisando dados', function ($arquivo, $contexto) {
            sleep(1);
            $contexto['step2'] = true;
            $contexto['finalizar'] = true;
            return $contexto;
        }),
    ])
    ->catch(function ($arquivo, $contexto, $codigoErro) {
        return [
            'titulo' => 'Erro',
            'descricao' => 'Falha ao processar',
        ];
    });
```

---

## 🔄 Como funciona

1. **Upload inicial**  
   - O arquivo é salvo via Livewire no disco configurado (`sedur-anexo-field.upload_disk`).

2. **Execução de steps**  
   - Cada step é definido via `AnexoField::step($titulo, $callback, $timeoutMs)`.
   - O callback PHP recebe:
     - `$arquivo`: caminho final do arquivo no storage.
     - `$contexto`: array que acumula dados entre os steps.
   - O retorno do callback é mesclado ao `$contexto`.

3. **Finalização antecipada**  
   - Se o callback setar `$contexto['finalizar'] = true`, o workflow encerra imediatamente com sucesso.

4. **Tratamento de erro**  
   - Se qualquer callback lançar exceção, é chamado o `catch()` definido no campo.

---

## 📜 Licença

Este pacote é open-souce sob a licença [MIT](LICENSE).

---

### 💡 Créditos
Desenvolvido por [CryptoManiacMS](https://github.com/CryptoManiacMS).