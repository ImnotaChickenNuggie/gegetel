# Proveedores de IA con cadena de respaldo: Qwen, Gemini y respuesta en código

El Agente de IA solo informa y recomienda Beneficios, así que no necesita un modelo muy especializado. Qwen por API gestionada es el modelo principal y Gemini Flash es el respaldo cuando Qwen falla o no responde a tiempo. Si los dos fallan, NestJS envía una respuesta determinista escrita en código, con los Créditos, los Beneficios destacados y el enlace al Catálogo. Así el Usuario de línea siempre recibe una respuesta. Si después los requisitos se vuelven más complejos, se puede sumar un modelo GPT, sin cambiar la cadena.

## Consequences

Cada proveedor de IA debe firmar un contrato sin entrenamiento con los datos y con retención cero, compatible con la ley mexicana de datos personales. Los prompts y las herramientas deben funcionar igual con ambos modelos, así que el servicio de IA usa una interfaz común compatible con OpenAI, y cada modelo se evalúa con el mismo set de casos. La respuesta en código no consume Crédito porque se libera la reserva. Los cortes por costo degradan primero a modelos y contextos más baratos, y solo al llegar al techo de gasto se usa la respuesta en código.
