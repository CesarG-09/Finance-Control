# Finance Control — Plan de evolución a v1.0

## Objetivo
Pasar de MVP a una versión 1.0 estable, segura y usable, priorizando:
- Nuevas funcionalidades de valor al usuario.
- Cambios de UX para mejorar claridad de información.
- Validaciones críticas para evitar errores de operación.

---

## Alcance propuesto (v1.0)

### 1) Nuevas funcionalidades

#### 1.1 Sistema de notificaciones por correo
**Descripción**
- Enviar correos al email personal del usuario para eventos importantes.

**Eventos iniciales sugeridos**
- Cambio de contraseña.
- Eliminación de perfil.
- Desactivación/reactivación de cuenta.
- Resumen semanal opcional de movimientos (fase posterior a v1.0 si el tiempo no alcanza).

**Criterios de aceptación**
- El usuario puede activar/desactivar cada tipo de notificación.
- Se registra en base de datos cada notificación enviada (estado: pendiente, enviada, error).
- Se maneja reintento básico en caso de fallo del proveedor de correo.

---

#### 1.2 Muro de notificaciones dentro del programa
**Descripción**
- Crear un panel/listado interno para comunicar novedades, cambios y avisos del sistema.

**Criterios de aceptación**
- Vista de notificaciones ordenadas por fecha.
- Estado leído/no leído por usuario.
- Marcado de todas como leídas.

---

#### 1.3 Administración de perfil propio
**Descripción**
- Permitir autogestión del perfil:
  - Cambio de correo.
  - Cambio de contraseña.
  - Actualización de datos personales.
  - Eliminación de perfil.

**Criterios de aceptación**
- Para acciones críticas, pedir confirmación de contraseña actual.
- Confirmaciones visuales claras y consistentes.
- Flujo de eliminación con doble confirmación.

---

### 2) Cambios funcionales y de UX

#### 2.1 Mostrar monto inicial como transacción gris
**Descripción**
- El monto inicial de cuenta debe verse como movimiento especial (solo lectura, color gris).

**Criterios de aceptación**
- Se muestra en el historial con etiqueta “Monto inicial”.
- No se puede editar ni eliminar.
- No altera cálculos actuales (solo mejora visual y trazabilidad).

---

#### 2.2 Agregar filtro por mes en "Movimientos"
**Descripción**
- Añadir selector de mes/año para filtrar transacciones.

**Criterios de aceptación**
- Filtro por mes vigente y meses pasados.
- Compatible con otros filtros existentes.
- Se mantiene el estado del filtro al navegar dentro del módulo.

---

#### 2.3 Mejorar mensajes de confirmación
**Descripción**
- Rediseñar mensajes al:
  - Desactivar/reactivar cuenta.
  - Eliminar transacción.

**Criterios de aceptación**
- Mensajes con contexto (cuenta/transacción afectada, impacto).
- Botones con acción clara (Cancelar / Confirmar).
- Prevención de acciones accidentales.

---

### 3) Mejoras de validación

#### 3.1 Validación de saldo en transacciones de salida
**Descripción**
- Al registrar egreso mayor al saldo:
  - O bloquear por política de negocio.
  - O permitir solo con confirmación explícita del usuario.

**Recomendación para v1.0**
- Permitir saldo negativo solo con confirmación adicional y mensaje de advertencia.

**Criterios de aceptación**
- Mensaje de alerta muestra saldo actual, monto de salida y saldo resultante.
- Se requiere confirmación manual del usuario para continuar.
- El evento queda auditado como “egreso con saldo negativo”.

---

## Propuesta técnica por fases

## Fase 0 — Diseño y definición (1 semana)
- Cerrar reglas funcionales (qué se permite y qué no).
- Diseñar modelo de datos para notificaciones y preferencias.
- Definir textos UX y estados de confirmación.

**Entregables**
- Documento de reglas de negocio.
- Esquema inicial de tablas/columnas.
- Wireframes rápidos para muro/filtros/modales.

## Fase 1 — Fundaciones backend y datos (1 semana)
- Tablas y servicios para:
  - Notificaciones internas.
  - Preferencias de notificación.
  - Log de correo.
- API/servicios para perfil y validaciones nuevas.

**Entregables**
- Migraciones.
- Servicios de datos versionados.
- Pruebas básicas de integración.

## Fase 2 — Implementación UI/UX (1–2 semanas)
- Muro de notificaciones.
- Perfil autogestionable.
- Filtro mensual en movimientos.
- Modales de confirmación mejorados.
- Render de “monto inicial” como transacción gris.

**Entregables**
- Pantallas funcionales.
- Estados de carga/error consistentes.
- Validaciones de formulario actualizadas.

## Fase 3 — Calidad, hardening y salida v1.0 (1 semana)
- QA funcional completo.
- Pruebas de regresión en cuentas/movimientos.
- Métricas y logs de eventos críticos.
- Checklist release y versión 1.0.

**Entregables**
- Checklist QA firmado.
- Notas de versión v1.0.
- Release candidate.

---

## Priorización sugerida (MoSCoW)

### Must-have (v1.0)
- Validación de saldo negativo con confirmación.
- Filtro por mes en movimientos.
- Mensajes de confirmación mejorados.
- Monto inicial como transacción gris.
- Administración de perfil (al menos cambio de contraseña/correo y datos básicos).

### Should-have
- Muro de notificaciones interno.

### Could-have
- Notificaciones por correo avanzadas (digest/resumen semanal).

---

## Riesgos y mitigación
- **Complejidad de correo transaccional** → iniciar con proveedor simple y plantillas mínimas.
- **Regresiones en balance/cálculos** → agregar pruebas de casos límite (saldo cero, negativo, múltiples cuentas).
- **Ambigüedad de reglas de negocio** → cerrar decisiones antes de codificar Fase 1.

---

## Definición de terminado para v1.0
- Funcionalidades Must-have desplegadas y probadas.
- Flujos críticos con mensajes y validaciones consistentes.
- Sin errores bloqueantes en registro de movimientos, cálculo de balance o perfil.
- Documentación de cambios y plan de soporte post-lanzamiento.
