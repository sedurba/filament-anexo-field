<?php

namespace Sedur\FilamentAnexoField;

use Filament\Support\Assets\AlpineComponent;
use Filament\Support\Facades\FilamentAsset;
use Filament\Support\Assets\Js;
use Filament\Support\Assets\Css;
use Illuminate\Support\ServiceProvider;

class FilamentAnexoFieldServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadViewsFrom(__DIR__ . '/../resources/views', 'filament-anexo');

        $this->publishes([
            __DIR__ . '/../resources/views' => resource_path('views/vendor/sedur/filament-anexo-field'),
        ], 'sedur::filament-anexo-field-views');

        FilamentAsset::register([
            Js::make('anexo-field', __DIR__ . '/../resources/dist/anexo-field.js'),
            Css::make('anexo-field', __DIR__ . '/../resources/dist/anexo-field.css'),
        ], package: 'sedur/filament-anexo-field');
    }
}
