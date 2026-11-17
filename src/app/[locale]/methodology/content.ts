import type { I18n } from "@/i18n/core";
import { ANALYSIS_CONFIG as C, requiredHistoryYears as minYears } from "@/lib/analysis/config";

interface Section {
  title: string;
  paragraphs?: string[];
  /** Definition list: a term and its explanation. */
  items?: { term: string; text: string }[];
}

export interface MethodologyContent {
  title: string;
  intro: string;
  sections: Section[];
}

/**
 * The methodology text in both languages. Every figure comes from the
 * analysis configuration, so the page cannot drift from what the code does.
 */
export function methodologyContent({ locale, percent, number }: I18n): MethodologyContent {
  const pct = (value: number) => percent(value, { digits: 0 });
  const w = C.weights;
  const cap = C.expectedCapAnnual;
  const paths = number(C.projection.paths);

  if (locale === "en") {
    return {
      title: "Methodology",
      intro:
        "ETF Analyzer looks only at an asset's daily price history and sums up, in a score from 0 to 100, whether moments like the present have historically been good ones to buy. It uses no fundamentals, news or analyst opinions.",
      sections: [
        {
          title: "The data",
          paragraphs: [
            "Daily closing prices from Yahoo Finance, adjusted for dividends and splits, so returns include dividends. Asset pages refresh several times a day and the ranking is rebuilt once a day.",
          ],
        },
        {
          title: "The five factors",
          items: [
            {
              term: `Historical evidence (${pct(w.evidence)})`,
              text: "Every past day on which the asset was about as far from its high as it is today is found, and what happened next is measured: how often it rose, by how much, and whether it did better than on an ordinary day.",
            },
            {
              term: `Discount from high (${pct(w.discount)})`,
              text: `How far it has fallen from its all-time high (a ${pct(C.discount.fullAt)} fall scores the maximum) and how unusual that fall is for this particular asset.`,
            },
            {
              term: `Trend (${pct(w.trend)})`,
              text: `Four checks: price above its ${C.trend.longSma}-session average, the ${C.trend.shortSma}-session average above the ${C.trend.longSma}-session one, the long average rising, and a positive last month.`,
            },
            {
              term: `Momentum (${pct(w.momentum)})`,
              text: `${C.rsi.period}-session RSI. Below ${C.rsi.oversold} (oversold) it adds; above ${C.rsi.overbought} (overbought) it subtracts.`,
            },
            {
              term: `Long run (${pct(w.longRun)})`,
              text: `Annual return over the last ${C.longRun.windowYears} years, or as many as are available. ${pct(C.longRun.fullAt)} a year or more scores the maximum.`,
            },
          ],
        },
        {
          title: "The verdict",
          paragraphs: [
            `A score of ${C.labels.buy} or more is a "Good buy", from ${C.labels.neutral} to ${C.labels.buy - 1} is "Neutral" and below ${C.labels.neutral} is "Wait".`,
            `Two safeguards apply. An asset whose long-run return is negative can never score above ${C.labels.negativeLongRunCap}. And each horizon needs enough history: ${minYears(1)} years for the 1-year estimate, ${minYears(3)} for 3 years and ${minYears(5)} for 5 years. With less than ${minYears(1)} years there is no verdict.`,
          ],
        },
        {
          title: "The expected return",
          paragraphs: [
            `It is the median of what happened after similar situations, blended with the asset's usual median: the more separate episodes there are, the more the similar situations weigh. If the asset has less than ${C.fullHistoryYears} years of history, the result is pulled towards a reference of ${pct(C.marketPriorAnnual)} a year.`,
            `The usual range runs from the 10th to the 90th percentile of those outcomes. Out of prudence, the estimate is capped at ${pct(cap[1])} a year for 1 year, ${pct(cap[3])} for 3 years and ${pct(cap[5])} for 5 years, so that assets with an exceptional past do not promise an exceptional future.`,
          ],
        },
        {
          title: "Confidence",
          paragraphs: [
            `High: at least ${C.confidence.highYears} years of data and ${C.confidence.highEpisodes} similar episodes. Low: less than ${C.confidence.lowYears} years of data, or no situation in the past comparable to today's. Medium: everything in between.`,
          ],
        },
        {
          title: "The simulator",
          paragraphs: [
            `The asset's historical monthly returns are resampled ${paths} times (bootstrap). The projection keeps the asset's volatility but replaces its past growth with a prudent rate, between ${pct(C.projection.driftFloor)} and ${pct(C.projection.driftCap)} a year. The pessimistic, central and optimistic scenarios are the 10th, 50th and 90th percentiles of those simulations.`,
          ],
        },
        {
          title: "Limitations",
          paragraphs: [
            "Past performance does not guarantee future results: this is a statistical summary of the past, not a prediction. A short or exceptional history distorts the estimate. Fees, taxes, exchange rates and inflation are not taken into account.",
            "ETF Analyzer is an educational tool and is not financial advice.",
          ],
        },
      ],
    };
  }

  return {
    title: "Metodología",
    intro:
      "ETF Analyzer mira únicamente el histórico de precios diarios de un activo y resume, en una puntuación de 0 a 100, si momentos como el actual han sido históricamente buenos para comprar. No usa fundamentales, noticias ni opiniones de analistas.",
    sections: [
      {
        title: "Los datos",
        paragraphs: [
          "Precios de cierre diarios de Yahoo Finance, ajustados por dividendos y splits, de modo que las rentabilidades incluyen los dividendos. Las fichas se actualizan varias veces al día y el ranking se recalcula una vez al día.",
        ],
      },
      {
        title: "Los cinco factores",
        items: [
          {
            term: `Evidencia histórica (${pct(w.evidence)})`,
            text: "Se buscan todos los días del pasado en los que el activo estaba a una distancia de su máximo parecida a la de hoy y se mide qué ocurrió después: cuántas veces subió, cuánto, y si le fue mejor que en un día cualquiera.",
          },
          {
            term: `Descuento desde máximos (${pct(w.discount)})`,
            text: `Cuánto ha caído desde su máximo histórico (una caída del ${pct(C.discount.fullAt)} da la nota máxima) y lo inusual que es esa caída para ese activo en concreto.`,
          },
          {
            term: `Tendencia (${pct(w.trend)})`,
            text: `Cuatro comprobaciones: precio por encima de su media de ${C.trend.longSma} sesiones, media de ${C.trend.shortSma} sesiones por encima de la de ${C.trend.longSma}, media larga al alza y último mes positivo.`,
          },
          {
            term: `Momento (${pct(w.momentum)})`,
            text: `RSI de ${C.rsi.period} sesiones. Por debajo de ${C.rsi.oversold} (sobreventa) suma; por encima de ${C.rsi.overbought} (sobrecompra) resta.`,
          },
          {
            term: `Largo plazo (${pct(w.longRun)})`,
            text: `Rentabilidad anual de los últimos ${C.longRun.windowYears} años, o de los que haya. Un ${pct(C.longRun.fullAt)} anual o más da la nota máxima.`,
          },
        ],
      },
      {
        title: "El veredicto",
        paragraphs: [
          `Con ${C.labels.buy} puntos o más es «Buena compra», de ${C.labels.neutral} a ${C.labels.buy - 1} es «Neutral» y por debajo de ${C.labels.neutral} es «Esperar».`,
          `Hay dos salvaguardas. Un activo con rentabilidad de largo plazo negativa nunca pasa de ${C.labels.negativeLongRunCap} puntos. Y cada horizonte exige histórico suficiente: ${minYears(1)} años para la estimación a 1 año, ${minYears(3)} para la de 3 años y ${minYears(5)} para la de 5 años. Con menos de ${minYears(1)} años no hay veredicto.`,
        ],
      },
      {
        title: "El retorno esperado",
        paragraphs: [
          `Es la mediana de lo ocurrido tras situaciones similares, mezclada con la mediana habitual del activo: cuantos más episodios distintos haya, más pesan las situaciones similares. Si el activo tiene menos de ${C.fullHistoryYears} años de histórico, el resultado se acerca a una referencia del ${pct(C.marketPriorAnnual)} anual.`,
          `El rango habitual va del percentil 10 al 90 de esos resultados. Por prudencia, la estimación tiene un tope del ${pct(cap[1])} anual a 1 año, del ${pct(cap[3])} a 3 años y del ${pct(cap[5])} a 5 años, para que un activo con un pasado excepcional no prometa un futuro excepcional.`,
        ],
      },
      {
        title: "La confianza",
        paragraphs: [
          `Alta: al menos ${C.confidence.highYears} años de datos y ${C.confidence.highEpisodes} episodios parecidos. Baja: menos de ${C.confidence.lowYears} años de datos, o ninguna situación del pasado comparable a la actual. Media: todo lo demás.`,
        ],
      },
      {
        title: "El simulador",
        paragraphs: [
          `Se remuestrean ${paths} veces las rentabilidades mensuales históricas del activo (bootstrap). La proyección conserva la volatilidad del activo, pero sustituye su crecimiento pasado por un ritmo prudente, entre el ${pct(C.projection.driftFloor)} y el ${pct(C.projection.driftCap)} anual. Los escenarios pesimista, central y optimista son los percentiles 10, 50 y 90 de esas simulaciones.`,
        ],
      },
      {
        title: "Limitaciones",
        paragraphs: [
          "Rentabilidades pasadas no garantizan rentabilidades futuras: esto es un resumen estadístico del pasado, no una predicción. Un histórico corto o excepcional distorsiona la estimación. No se tienen en cuenta comisiones, impuestos, tipo de cambio ni inflación.",
          "ETF Analyzer es una herramienta educativa y no constituye asesoramiento financiero.",
        ],
      },
    ],
  };
}
