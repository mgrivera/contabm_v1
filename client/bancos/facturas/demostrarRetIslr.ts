

import * as angular from 'angular';
import { DialogInfoModal } from '../../imports/general/showInfoModal/showInfoModal'; 

import { mensajeErrorDesdeMethod_preparar } from '../../imports/clientGlobalMethods/mensajeErrorDesdeMethod_preparar'; 

angular.module("contabm").controller('DemostrarRetencionIslr_Modal_Controller',
['$scope', '$modalInstance', '$modal', 'companiaContabSeleccionada', 'factura',
function ($scope, $modalInstance, $modal, companiaContabSeleccionada, factura) {

    // ui-bootstrap alerts ...
    $scope.alerts = [];

    $scope.closeAlert = function (index) {
        $scope.alerts.splice(index, 1);
    }

    $scope.ok = function () {
        $modalInstance.close("Okey");
    }

    $scope.cancel = function () {
        $modalInstance.dismiss("Cancel");
    }

    $scope.companiaContabSeleccionada = companiaContabSeleccionada;

    // determinamos el item en el array de impuestos y retenciones, que corresponde a la retención de Islr 
    let retencionIslr = factura.impuestosRetenciones.find((x) => x.impRetID === 3); 

    $scope.retencionIslr = {
        montoBase: 0,  
        porcentaje: 0, 
        montoAntesSustraendo: 0, 
        sustraendo: 0, 
        monto: 0, 
    }; 

    if (retencionIslr) { 
        $scope.retencionIslr = retencionIslr; 
    }

    $scope.showProgress = true; 

    $scope.showInfoAboutThisPage = () => { 
        let message = `<div style="min-width: 400px; "> 
                        <p>
                            El objetivo de este diálogo es demostrar la forma como el programa determina el <em>monto de retención del Islr</em>. 
                        </p>
                        <p>
                            Lo primero que hace el programa es leer un registro para la <em>unidad tributaria</em>. Igual lee un registro para la 
                            <em>categoría de retención</em>. La unidad tributaria leída, es aquella cuya fecha es más reciente, en relación a la 
                            <em>fecha de recepción</em> de la factura. Igual se hace para la categoría de 
                            retención, pero, además de la fecha de recepción de la factura, se incluye en el criterio de busqueda, 
                            el <em>tipo de persona</em> (Nat/Jur) y la <em>categoría de retención</em> indicada para el proveedor, por ejemplo 'Honorarios'. 
                        </p>
                        <p>
                            Con el registro de la unidad tributaria, viene su <em>monto</em> y el <em>factor</em>. <br /> 
                            Con el registro de la categoría de retención, viene el <em>porcentaje de retención</em> y el <em>código</em>. 
                        </p>
                        <p>
                            Para calcular el monto <em>a partir de</em> (o monto mínimo), se usa esta fórmula: (1.000 x U.T. / 12). <br /> 
                            Para calcular el <em>sustraendo</em>, se usa esta fórmula: (U.T. x %Ret x factor). 
                        </p>
                        <p>
                            Aunque el programa intenta determinar el cálculo de la retención, el usuario <b>siempre</b> puede cambiar los montos 
                            como le parezca. 
                        </p>
                        <p>
                            Es por eso que este diálogo muestra:
                            <ol>
                                <li>el método usado por el programa</li>
                                <li>los montos que finalmente registró el usuario</li>
                            </ol>  
                        </p>
                    </div>`; 

        DialogInfoModal($modal, "<em>Demostración del cálculo de la retención del Islr</em>", message, 'md').then();
        return; 
    }

    // para poder demostrar el cálculo de la retención de Islr, debemos leer la categoría y la UT desde el server 
    Meteor.call('bancos.facturas.leerRetencionIslr', factura.fechaRecepcion, factura.proveedor, (err, result) => {

        if (err) {
            let errorMessage = mensajeErrorDesdeMethod_preparar(err);

            $scope.alerts.length = 0;
            $scope.alerts.push({
                type: 'danger',
                msg: errorMessage
            });

            $scope.showProgress = false;
            $scope.$apply();

            return;
        }

        if (result.error) {
            let errorMessage = result.message;

            $scope.alerts.length = 0;
            $scope.alerts.push({
                type: 'danger',
                msg: errorMessage
            });

            $scope.showProgress = false;
            $scope.$apply();

            return;
        }

        $scope.unidadTributaria = result.unidadTributaria; 
        $scope.categoriaRetencion = result.categoriaRetencion; 

        // nótese como el 'minimo' y el sustraendo se determinan ambos en base al factor, el %, y la UT ...  
        $scope.aPartirDe = 1000 * result.unidadTributaria.monto / 12;          
        $scope.sustraendo = result.unidadTributaria.monto * (result.categoriaRetencion.porcentajeRetencion / 100) * 
                            result.unidadTributaria.factor;      

        // determinamos el monto 'base' para el cálculo del la retención del Islr 
        $scope.baseRetIslr = 0; 
        $scope.baseRetIslr += factura.montoFacturaSinIva ? factura.montoFacturaSinIva : 0; 
        $scope.baseRetIslr += factura.montoFacturaConIva ? factura.montoFacturaConIva : 0; 

        $scope.montoAntesSustraendo = 0; 
        $scope.retencionFinal = 0; 

        if ($scope.baseRetIslr >= $scope.aPartirDe) { 
            $scope.montoAntesSustraendo = $scope.baseRetIslr * (result.categoriaRetencion.porcentajeRetencion / 100); 
            $scope.retencionFinal = $scope.montoAntesSustraendo - $scope.sustraendo; 
        }
        
        $scope.showProgress = false;
        $scope.$apply();
    })
}
])