# MXT 033 -> HANDOFF DE INVESTIGACION - 70 PUNTOS

## A-Iteration

User-defined rules are primary.
This Library MD is the source of A-Iteration Anchors for its scope.
A-Iteration Anchors preserve the user's exact words.
AI never rewrites or reinterprets them.
A-Iteration Anchors are constraints, not complete implementation specifications.
Everything not constrained by an Anchor remains available for AI reasoning, design, simplification, implementation, and improvement.
The AI has an objective obligation to improve the system within those remaining degrees of freedom.
Do not treat absence of explicit human instruction as a prohibition on improvement.
If proceeding requires changing an Anchor or inventing unresolved semantics necessary to satisfy it, AI must negotiate with the user.
Respect ontology. Do not invent.
Only present what canonically exists in the epistemology.
If the required epistemology does not exist, do not add it; stop and report it.
Never change a user-defined A-Iteration rule.
Preserve A-Iteration Anchors.
Preserve what works.
Change only what is necessary.
Do not fix what does not block.
UI may simplify, hide, reorganize, or derive presentation from canonical data when this does not change meaning.
When genuinely blocked, isolate the smallest unresolved question.
Verify the result.

## A-Iteration Anchors

# MXT 033 → HANDOFF DE INVESTIGACIÓN — 70 PUNTOS

## A. Accounting y unidad de análisis

1. **No execution = Realized R = 0R.** Missed entry, chase o desplazamiento favorable sin participación no producen -1R realizado.

2. **Opportunity ≠ PLAN ≠ Trade.** Una misma oportunidad de mercado puede generar varios PLANs y eventualmente varios trades.

3. **No multiplicar oportunidades.** Varios PLANs sobre el mismo movimiento no deben convertirse artificialmente en varias oportunidades estadísticas independientes.

4. **Duplicados no generan evidencia independiente.** PLANs duplicados permanecen excluidos del conteo estadístico de oportunidades.

5. **-1R conserva significado económico.** Representa una pérdida bajo una geometría realmente evaluada/ejecutada, no una penalización conductual por haber administrado mal una oportunidad.

6. **Calidad de administración ≠ resultado R.** Deben permanecer separadas.

7. **Planned R ≠ Realized R.** Si el plan ofrecía 4R y el trade realmente captura +3R, el resultado es +3R.

8. **Opportunity-level accounting.** Cuando existen múltiples intentos sobre una oportunidad, además del resultado individual de cada trade interesa el resultado acumulado de la secuencia.

---

## B. Opportunity Path

9. **Favorable Displacement Without Participation** es el dato primitivo: cuánto avanzó favorablemente el precio desde la geometría original sin participación.

10. Debe expresarse inicialmente utilizando el **R de la geometría original**.

11. **No llamarlo automáticamente “consumed R”.** Desplazamiento observado y consumo económico no son necesariamente equivalentes.

12. **Opportunity Consumption** es una interpretación posterior que debe demostrarse empíricamente.

13. **Remaining distance ≠ remaining R:R.** La distancia restante al target expresada en unidades del riesgo original no representa automáticamente el R:R disponible para una nueva entrada.

14. Para una entrada posterior debe calcularse una **geometría válida en ese momento**: entry, stop, target y risk.

15. El análisis debe utilizar únicamente información disponible en cada momento del path. Evitar hindsight del tipo “después subió, entonces había que comprar”.

---

## C. PLAN-010 como primer laboratorio

16. PLAN-010 original: entry 60, stop 55, target 88, risk 5, planned R:R 5.6R.

17. Peak Reality observado: 82.46.

18. Favorable displacement desde entry: 22.46 = **4.492R originales**.

19. Distancia restante al target en peak: 5.54 = **1.108 unidades del riesgo original**.

20. Ese 1.108 **no significa automáticamente una oportunidad nueva de 1.108R**.

21. Una entrada tardía sobre PLAN-010 debe evaluarse como nueva geometría, no mediante simple resta `5.6R - 4.492R`.

22. Si la nueva geometría cambia materialmente entry/risk/stop/R:R, puede representar **otro PLAN/trade decision dentro de la misma oportunidad**.

23. Por tanto, PLAN-010 debe servir para estudiar múltiples decisiones posibles a lo largo de una sola trayectoria sin convertirlas en múltiples oportunidades independientes.

---

## D. Checkpoints experimentales

24. Registrar el primer momento en que una oportunidad sin participación alcanza **+0.5R** desde la entry original.

25. Registrar igualmente el primer **+1R**.

26. Para cada checkpoint capturar timestamp y precio.

27. Medir subsequent MFE desde el checkpoint.

28. Medir subsequent MAE.

29. Determinar si posteriormente se alcanza el stop original.

30. Determinar si posteriormente se alcanza el target original.

31. Medir comportamiento y profundidad del pullback posterior.

32. Estos checkpoints son **observaciones de trayectoria**, no fills, trades ni Realized R.

33. Varias observaciones dentro de un path pueden aportar información legítima, pero no deben fingirse como trades estadísticamente independientes.

---

## E. Chase Risk

34. Investigar cómo cambia el riesgo de participar conforme aumenta el favorable displacement without participation.

35. **0–0.5R**: hipótesis de que todavía podría permitir participación rápida. No es regla.

36. **≈1R**: hipótesis de degradación material de asimetría. No es regla.

37. **>1R**: hipótesis USER de que esperar pullback puede empezar a dominar chase. Debe falsarse o confirmarse con datos.

38. El displacement por sí solo probablemente será insuficiente: también importa la **nueva asimetría estructural disponible**.

39. **≈3R disponible**: candidato de investigación para full participation.

40. **4R → 3R no implica automáticamente abandonar.** Si una geometría nueva legítima todavía ofrece ~3R, puede continuar siendo atractiva.

41. Tampoco significa automáticamente GO: un 3R tardío puede tener una tasa de éxito diferente de un 3R originado en una entrada estructural inicial.

42. **≈2.5R**: candidato de investigación para OLE/participación parcial.

43. **≈2R**: candidato similar donde OLE puede ser preferible a exposición completa.

44. Debemos descubrir empíricamente el **minimum acceptable R**, no establecer 2R, 2.5R o 3R como fronteras anticipadamente.

45. Eventualmente interesa **expectancy**, no R:R aislado. Un 3R con probabilidad muy degradada puede ser inferior a un 2R estructuralmente fuerte.

---

## F. OLE — Optimized Layered Entry

46. Auditar primero el OLE ya existente antes de crear cualquier mecanismo nuevo de chase.

47. Determinar exactamente qué parámetros, sizing/layers, evidence y reglas utiliza OLE actualmente.

48. OLE puede ser más que optimización del precio: potencialmente controla **cuánta exposición obtenemos inicialmente y cuánta capacidad reservamos**.

49. Comparar **full entry vs OLE** cuando todavía existe una geometría atractiva.

50. Comparar **OLE vs esperar una entrada perfecta** que puede nunca ocurrir.

51. Comparar **OLE temprano vs chase tardío**: participar parcialmente antes podría reducir la necesidad posterior de perseguir.

52. Investigar también **OLE después de displacement**: si puede servir como participación tardía controlada.

53. Si aparece pullback después de participación parcial, estudiar si completar/optimizar la posición mejora expectancy.

54. Un pullback no es necesariamente sólo MAE: dentro de OLE puede representar una oportunidad de mejorar la posición.

55. No inventar todavía reglas como `3R = full`, `2.5R = X%`, `2R = Y%`. Primero auditar OLE y después medir.

---

## G. Pullback y pérdida de oportunidad

56. Medir cuánto suelen retroceder los casos después de +0.5R, +1R y otros desplazamientos relevantes.

57. Medir la **probabilidad de regresión**: cuántas oportunidades extendidas vuelven a ofrecer una entrada razonable.

58. Medir también la **probabilidad de no regresar**: costo real de esperar pullback mientras el movimiento continúa sin nosotros.

59. Esto permite comparar cuatro alternativas: entrada completa, OLE/participación parcial, chase tardío y abandonar/esperar nueva asimetría.

---

## H. Re-entry, soporte y geometría

60. Una reentrada debe evaluarse también por **proximidad a soporte estructural**, no únicamente por R:R.

61. Auditar evidencia existente de **soporte + volumen + geometría** antes de crear nuevas métricas.

62. Un soporte válido puede justificar estructuralmente un nuevo stop y mejorar R:R sin fabricar matemáticamente la geometría.

63. Comparar estadísticamente reentradas cerca de soporte estructural versus reentradas equivalentes alejadas de soporte: success rate, MFE, MAE y R.

64. La decisión eventualmente puede depender de una interacción como: **R disponible × soporte × volumen × geometría × comportamiento del activo**.

---

## I. Economía acumulativa de reentrada

65. Reentrar sobre prácticamente la misma geometría tiene costo acumulativo. Ejemplo: primer intento `-1R`, reentrada `+3R` → resultado de la secuencia = **+2R**.

66. Un tercer intento erosiona más la economía: `-1R -1R +3R = +1R`. Por tanto, el **número de reentrada** debe estudiarse.

67. Una reentrada inferior puede restaurar, por ejemplo, ~4R, pero puede estar ocurriendo **contra corriente**. Mejor R:R geométrico no significa necesariamente mejor trade.

68. Analizar pérdidas/reentradas por **trend alignment vs counter-trend**, playbook y número de intento. Investigar también si una reentrada debería tener invalidación/salida más rápida que -1R completo, pero sólo cuando exista justificación estructural/playbook; no acortar stops para mejorar artificialmente estadísticas.

---

## J. Gobernanza de datos y universo estadístico

69. **Las métricas nuevas serán principalmente prospectivas.** No reabrir automáticamente casos completados en Supabase para rellenar variables que MXT no identificaba ni capturaba entonces. Un caso histórico sólo entra en una métrica nueva cuando la evidencia necesaria ya existe canónicamente y puede derivarse sin reconstrucción/hindsight. Por ello diferentes análisis pueden tener distintos `N` y distintas fechas de inicio.

70. **Entrada manual vs automática/staged.** Capturar prospectivamente execution mode y comparar participation/missed-opportunity rate, planned vs executed price, slippage, Realized R, MFE/MAE, stop/target y re-entry. Posteriormente segmentar, donde el N lo permita, por playbook, OLE/full, trend y re-entry. No clasificar retrospectivamente casos completados si execution mode no quedó registrado.

---

### Principio de control para el siguiente chat

Todavía **no convertir ninguno de estos candidatos en Mechanics**.

La secuencia es:

**Evidence → Comparison → Statistics → Learning → Mechanics**

Y antes de crear nuevas métricas/ontología:

**Reuse Reality + Opportunity Path + OLE + evidencia existente de volumen/soporte/geometría.**

El problema central que estamos intentando resolver ya no es simplemente *“cuándo no perseguir”*. Es:

> **Dada una oportunidad que evoluciona, ¿cuándo conviene entrar full, participar mediante OLE, esperar pullback, reentrar con nueva geometría o abandonar; y cómo cambia esa decisión según R disponible, estructura, volumen, tendencia, ejecución y costo acumulado de intentos?**

Ese es el núcleo de investigación que debe heredar el siguiente chat.
