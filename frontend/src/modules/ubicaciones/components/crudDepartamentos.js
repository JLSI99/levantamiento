import { CreateDepartamento } from '/src/modules/ubicaciones/components/departamentosComponents/CreateDepartamento.js';
import { ReadDepartamentos } from '/src/modules/ubicaciones/components/departamentosComponents/ReadDepartamentos.js';
import { UpdateDepartamento } from '/src/modules/ubicaciones/components/departamentosComponents/UpdateDepartamento.js';
import { DeleteDepartamento } from '/src/modules/ubicaciones/components/departamentosComponents/DeleteDepartamento.js';

export class CrudDepartamentos {
    constructor(containerId, permisos) {
        this.containerId = containerId;
        this.permisos = permisos || {};

        this._editingDeptoId = null;
        this._departamentosCache = new Map();
        this._abortController = new AbortController();

        this.createComp = new CreateDepartamento(this.permisos, () => this.cargarDatos());
        this.readComp = new ReadDepartamentos(this.permisos);
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <!-- Formulario de Departamentos -->
            <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 4px; background: #ffffff;">
                <h4 id="form-depto-titulo" style="margin-top:0; color:#424242;">Alta de Departamento</h4>
                ${this.createComp.renderFormHTML()}
            </div>

            <!-- Tabla de Departamentos -->
            <div>
                ${this.readComp.renderTableHTML()}
            </div>
        `;

        this.bindEvents();
        this.cargarDatos();
    }

    bindEvents() {
        const signal = this._abortController.signal;

        this.createComp.bindSubmit(
            signal,
            () => this._editingDeptoId,
            () => this.desactivarEdicionDepto()
        );

        const tbodyDepto = document.getElementById('tbody-departamentos');
        if (tbodyDepto) {
            tbodyDepto.addEventListener('click', async (e) => {
                const btnEdDepto = e.target.closest('.btn-editar-depto');
                const btnDelDepto = e.target.closest('.btn-borrar-depto');

                if (btnEdDepto) {
                    this.activarEdicionDepto(btnEdDepto.getAttribute('data-id'));
                } else if (btnDelDepto && this.permisos.borrar) {
                    const id = btnDelDepto.getAttribute('data-id');
                    await DeleteDepartamento.ejecutar(id, () => this.cargarDatos());
                }
            }, { signal });
        }
    }

    activarEdicionDepto(idDepto) {
        const depto = this._departamentosCache.get(idDepto);
        if (!depto) return;

        this._editingDeptoId = idDepto;
        UpdateDepartamento.activar(depto);
    }

    desactivarEdicionDepto() {
        this._editingDeptoId = null;
        UpdateDepartamento.desactivar();
    }

    async cargarDatos() {
        await this.readComp.cargarDatos(this._departamentosCache);
    }

    unmount() {
        this._abortController.abort();
    }
}