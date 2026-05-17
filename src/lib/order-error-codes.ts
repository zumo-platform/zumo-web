import {
  CreateDashboardOrderError,
  type CreateOrderInput,
} from "@/lib/dashboard-orders";

export const ORDER_ERROR_CODES = {
  VALIDATION_CLIENT: "ORD-001",
  VALIDATION_LINES: "ORD-002",
  VALIDATION_QUANTITY: "ORD-003",
  CUSTOMER_NOT_FOUND: "ORD-100",
  PRODUCT_NOT_FOUND: "ORD-101",
  AUTH_EXPIRED: "ORD-200",
  SERVER_ERROR: "ORD-500",
  NETWORK_ERROR: "ORD-900",
  UNKNOWN: "ORD-999",
} as const;

export type OrderErrorCode = (typeof ORDER_ERROR_CODES)[keyof typeof ORDER_ERROR_CODES];

export type MappedOrderError = Readonly<{
  code: OrderErrorCode;
  title: string;
  message: string;
  details: string;
}>;

const ORDER_CREATE_ENDPOINT = "POST /dashboard/orders";

function buildOrderErrorDetails(params: {
  code: OrderErrorCode;
  message: string;
  httpStatus?: number;
  responseBody?: Record<string, unknown>;
  requestBody?: CreateOrderInput;
  extra?: Record<string, unknown>;
}): string {
  return JSON.stringify(
    {
      code: params.code,
      message: params.message,
      timestamp: new Date().toISOString(),
      endpoint: ORDER_CREATE_ENDPOINT,
      httpStatus: params.httpStatus,
      responseBody: params.responseBody,
      requestBody: params.requestBody,
      ...params.extra,
    },
    null,
    2,
  );
}

function mapValidation400(
  error: CreateDashboardOrderError,
  requestBody: CreateOrderInput,
): MappedOrderError {
  const keys = error.details ? Object.keys(error.details) : [];
  const hasCustomer = keys.some((k) => k === "customerId" || k.startsWith("customerId."));
  const hasQuantity = keys.some((k) => k.includes("quantity"));
  const hasLines = keys.some((k) => k === "lines" || k.startsWith("lines."));

  if (hasCustomer) {
    return {
      code: ORDER_ERROR_CODES.VALIDATION_CLIENT,
      title: "Datos incompletos",
      message: "Seleccioná un cliente válido antes de crear el pedido.",
      details: buildOrderErrorDetails({
        code: ORDER_ERROR_CODES.VALIDATION_CLIENT,
        message: "Validación de cliente fallida",
        httpStatus: 400,
        responseBody: error.responseBody,
        requestBody,
        extra: { fieldErrors: error.details },
      }),
    };
  }

  if (hasQuantity) {
    return {
      code: ORDER_ERROR_CODES.VALIDATION_QUANTITY,
      title: "Cantidad inválida",
      message: "Revisá las cantidades de cada línea: deben ser mayores a cero.",
      details: buildOrderErrorDetails({
        code: ORDER_ERROR_CODES.VALIDATION_QUANTITY,
        message: "Validación de cantidad fallida",
        httpStatus: 400,
        responseBody: error.responseBody,
        requestBody,
        extra: { fieldErrors: error.details },
      }),
    };
  }

  if (hasLines || keys.length > 0) {
    return {
      code: ORDER_ERROR_CODES.VALIDATION_LINES,
      title: "Datos incompletos",
      message: "Revisá que todos los campos requeridos estén completos en cada línea del pedido.",
      details: buildOrderErrorDetails({
        code: ORDER_ERROR_CODES.VALIDATION_LINES,
        message: "Validación de líneas fallida",
        httpStatus: 400,
        responseBody: error.responseBody,
        requestBody,
        extra: { fieldErrors: error.details },
      }),
    };
  }

  return {
    code: ORDER_ERROR_CODES.VALIDATION_LINES,
    title: "Datos incompletos",
    message: "El servidor respondió con un error de validación. Revisá los datos e intentá de nuevo.",
    details: buildOrderErrorDetails({
      code: ORDER_ERROR_CODES.VALIDATION_LINES,
      message: error.message,
      httpStatus: 400,
      responseBody: error.responseBody,
      requestBody,
    }),
  };
}

export function mapOrderError(
  error: unknown,
  context: Readonly<{ requestBody: CreateOrderInput }>,
): MappedOrderError {
  const { requestBody } = context;

  if (error instanceof CreateDashboardOrderError) {
    const responseBody = error.responseBody;

    if (error.status === 401 || error.status === 403) {
      return {
        code: ORDER_ERROR_CODES.AUTH_EXPIRED,
        title: "Sesión expirada",
        message: "Tu sesión expiró. Cerrá sesión y volvé a iniciar.",
        details: buildOrderErrorDetails({
          code: ORDER_ERROR_CODES.AUTH_EXPIRED,
          message: error.message,
          httpStatus: error.status,
          responseBody,
          requestBody,
        }),
      };
    }

    if (error.status === 404) {
      return {
        code: ORDER_ERROR_CODES.CUSTOMER_NOT_FOUND,
        title: "Cliente no encontrado",
        message: "El cliente seleccionado no existe o no pertenece a tu empresa.",
        details: buildOrderErrorDetails({
          code: ORDER_ERROR_CODES.CUSTOMER_NOT_FOUND,
          message: error.message,
          httpStatus: 404,
          responseBody,
          requestBody,
        }),
      };
    }

    if (error.status === 422) {
      const lineHint =
        error.lineIndex !== undefined
          ? ` (línea ${String(error.lineIndex + 1)})`
          : "";
      return {
        code: ORDER_ERROR_CODES.PRODUCT_NOT_FOUND,
        title: "Producto no válido",
        message: `Uno de los productos seleccionados no existe en tu catálogo. Revisá las líneas del pedido${lineHint}.`,
        details: buildOrderErrorDetails({
          code: ORDER_ERROR_CODES.PRODUCT_NOT_FOUND,
          message: error.message,
          httpStatus: 422,
          responseBody,
          requestBody,
          extra: { lineIndex: error.lineIndex },
        }),
      };
    }

    if (error.status === 400) {
      return mapValidation400(error, requestBody);
    }

    if (error.status >= 500) {
      return {
        code: ORDER_ERROR_CODES.SERVER_ERROR,
        title: "Error del servidor",
        message: "Ocurrió un error inesperado. Intentá de nuevo en unos minutos.",
        details: buildOrderErrorDetails({
          code: ORDER_ERROR_CODES.SERVER_ERROR,
          message: error.message,
          httpStatus: error.status,
          responseBody,
          requestBody,
        }),
      };
    }

    return {
      code: ORDER_ERROR_CODES.UNKNOWN,
      title: "Error desconocido",
      message: error.message || "Ocurrió un error inesperado. Copiá el código de error y contactá soporte.",
      details: buildOrderErrorDetails({
        code: ORDER_ERROR_CODES.UNKNOWN,
        message: error.message,
        httpStatus: error.status,
        responseBody,
        requestBody,
      }),
    };
  }

  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed")) {
      return {
        code: ORDER_ERROR_CODES.NETWORK_ERROR,
        title: "Sin conexión",
        message: "No se pudo conectar con el servidor. Verificá tu conexión a internet.",
        details: buildOrderErrorDetails({
          code: ORDER_ERROR_CODES.NETWORK_ERROR,
          message: error.message,
          requestBody,
          extra: { errorType: "TypeError" },
        }),
      };
    }
  }

  return {
    code: ORDER_ERROR_CODES.UNKNOWN,
    title: "Error desconocido",
    message: "Ocurrió un error inesperado. Copiá el código de error y contactá soporte.",
    details: buildOrderErrorDetails({
      code: ORDER_ERROR_CODES.UNKNOWN,
      message: error instanceof Error ? error.message : String(error),
      requestBody,
      extra: { error: String(error) },
    }),
  };
}
