# TAREAS PARA PAYMENT-MANAGEMENT COMPONENT

## **FILOSOFÍA DEL COMPONENTE**
El componente `payment-management` debe mantener su funcionalidad actual de gestión de pagos (completo, depósito, plazos) pero requiere ajustes en el backend para mejorar la información enviada a los proveedores de pago.

## **TAREAS PRINCIPALES**

### **Tarea 1: Obtener datos del líder de la reserva en el backend**
- **Problema**: Los pagos de Redsys y Scalapay se crean sin información del líder de la reserva
- **Solución**: Modificar la creación de pagos para incluir datos del líder
- **Archivo**: Backend - Servicios de creación de pagos
- **Detalles**:
  - Obtener información del líder de la reserva antes de crear el pago
  - Incluir datos del líder en la creación del pago de Redsys
  - Incluir datos del líder en la creación del pago de Scalapay
- **Resolución**:
  - Creados métodos privados : getLeaderData, en ambos proyectos junto a todos los CRUDs necesarios.
  - Llamados ambos métodos desde las conexiones de envío de pago a ambas Apis.
  - Los datos son: Scalapay -> nombre, apellidos, telefono y email (Revisra y decidir que campos se envían); redsys -> nombre y apellido (Comprobado, se muestra)

### **Tarea 2: Ajustar nombre del producto en Redsys**
- **Problema**: El nombre del producto en Redsys no incluye información del tour y fecha
- **Solución**: Modificar el nombre del producto para incluir nombre del tour + fecha de salida
- **Archivo**: Backend - Servicio de Redsys
- **Formato**: `[Nombre del Tour] - [Fecha de Salida]`
- **Resolución**:
  - Creado método getProductName en core.diffrenetroads.redsys
  - Este método, a partir del reservationId y diferentes CRUDs añadidos extrae el nombre del tour y la departure date y lo pasa a redsys mediante el parámetro ds_merchant_productDescription.
  - Se han hecho pruebas y el nombre aparece en el carrusel de pago de redsys con el formato correspondiente.

### **Tarea 3: Ajustar nombre del producto en Scalapay**
- **Problema**: El nombre del producto en Scalapay no incluye información del tour y fecha
- **Solución**: Modificar el nombre del producto para incluir nombre del tour + fecha de salida
- **Archivo**: Backend - Servicio de Scalapay
- **Formato**: `[Nombre del Tour] - [Fecha de Salida]`

## **BENEFICIOS ESPERADOS**

- ✅ **Información completa del líder**: Los pagos incluyen datos del responsable de la reserva
- ✅ **Identificación clara del producto**: Nombre descriptivo con tour y fecha
- ✅ **Mejor trazabilidad**: Fácil identificación de pagos en sistemas externos
- ✅ **Experiencia mejorada**: Información clara en confirmaciones de pago

## **NOTAS IMPORTANTES**

1. **Backend únicamente**: Estas tareas se implementan en el backend, no en el componente Angular
2. **Datos del líder**: Obtener información completa del viajero marcado como líder
3. **Formato consistente**: Mismo formato de nombre para Redsys y Scalapay
4. **Fecha de salida**: Usar el formato de fecha apropiado para cada proveedor
5. **Compatibilidad**: Asegurar que los cambios no afecten la funcionalidad existente

## **ARCHIVOS AFECTADOS**

- Backend - Servicios de creación de pagos
- Backend - Servicio de Redsys
- Backend - Servicio de Scalapay
- Backend - Servicios de reserva (para obtener datos del líder)

## **PRIORIDAD DE IMPLEMENTACIÓN**

1. **Alta**: Obtener datos del líder de la reserva
2. **Alta**: Ajustar nombre del producto en Redsys
3. **Alta**: Ajustar nombre del producto en Scalapay
