<?php

namespace Sedur\FilamentAnexoField;

use Filament\Support\Assets\Js;
use Filament\Support\Facades\FilamentAsset;
use Illuminate\Support\ServiceProvider;

class FilamentAnexoFieldServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->loadViewsFrom(__DIR__ . '/../resources/views', 'filament-anexo');
        $this->mergeConfigFrom(__DIR__ . '/config.php', 'sedur-anexo-field');
        $this->publishes([__DIR__ . '/config.php' => config_path('sedur-anexo-field.php')], 'sedur::filament-anexo-field-config');
        $this->publishes([__DIR__ . '/../resources/views' => resource_path('views/vendor/sedur/filament-anexo-field')], 'sedur::filament-anexo-field-views');

        FilamentAsset::register([
            Js::make('sedur-anexo-field-init', __DIR__ . '/../resources/dist/anexo-field.js')
        ], package: 'sedur/filament-anexo-field');
    }
}
