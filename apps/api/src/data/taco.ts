/**
 * Tabela TACO — Tabela Brasileira de Composição de Alimentos
 * Valores por 100g (ou 100ml para líquidos)
 * typical_unit / typical_amount: sugestão de medida padrão para o editor
 * unit_weight_g: gramas equivalentes a 1 unit (p/ 'unidade', 'fatia', 'porção')
 */

export interface TacoFood {
  id: number
  name: string
  category: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  typical_amount: number
  typical_unit: 'g' | 'ml' | 'unidade' | 'fatia' | 'colher de sopa' | 'colher de chá' | 'xícara' | 'porção'
  unit_weight_g: number // gramas por 1 unidade do típico_unit
}

// ── Unidades fixas (gramas por 1 unidade da medida) ───────────
export const UNIT_WEIGHTS: Record<string, number> = {
  'g':              1,
  'ml':             1,
  'colher de sopa': 15,
  'colher de chá':  5,
  'xícara':         200,
  'fatia':          30,
  'porção':         100,
  'unidade':        100, // override por alimento via unit_weight_g
}

export function calcMacros(food: TacoFood, qty: number, unit: string) {
  // gramas efetivos
  const g = unit === 'unidade' || unit === 'fatia' || unit === 'porção'
    ? qty * food.unit_weight_g
    : qty * (UNIT_WEIGHTS[unit] ?? 1)
  const f = g / 100
  return {
    kcal:    Math.round(food.kcal    * f * 10) / 10,
    protein: Math.round(food.protein * f * 10) / 10,
    carbs:   Math.round(food.carbs   * f * 10) / 10,
    fat:     Math.round(food.fat     * f * 10) / 10,
    fiber:   Math.round(food.fiber   * f * 10) / 10,
  }
}

// ── Alimentos ─────────────────────────────────────────────────
export const TACO: TacoFood[] = [
  // ── Cereais e grãos ──────────────────────────────────────
  { id:1,  name:'Arroz branco cozido',         category:'Cereais e grãos',       kcal:128, protein:2.5,  carbs:28.1, fat:0.2,  fiber:1.6, typical_amount:4,   typical_unit:'colher de sopa', unit_weight_g:18  },
  { id:2,  name:'Arroz integral cozido',       category:'Cereais e grãos',       kcal:124, protein:2.6,  carbs:25.8, fat:0.5,  fiber:1.7, typical_amount:4,   typical_unit:'colher de sopa', unit_weight_g:18  },
  { id:3,  name:'Pão francês',                 category:'Cereais e grãos',       kcal:300, protein:8.0,  carbs:58.6, fat:1.3,  fiber:2.3, typical_amount:1,   typical_unit:'unidade',        unit_weight_g:50  },
  { id:4,  name:'Pão de forma integral',       category:'Cereais e grãos',       kcal:253, protein:9.1,  carbs:44.7, fat:4.0,  fiber:5.6, typical_amount:2,   typical_unit:'fatia',          unit_weight_g:25  },
  { id:5,  name:'Pão de forma branco',         category:'Cereais e grãos',       kcal:267, protein:7.9,  carbs:50.6, fat:3.0,  fiber:2.3, typical_amount:2,   typical_unit:'fatia',          unit_weight_g:25  },
  { id:6,  name:'Aveia em flocos',             category:'Cereais e grãos',       kcal:394, protein:13.9, carbs:67.0, fat:8.5,  fiber:9.1, typical_amount:4,   typical_unit:'colher de sopa', unit_weight_g:10  },
  { id:7,  name:'Macarrão cozido',             category:'Cereais e grãos',       kcal:143, protein:4.8,  carbs:28.7, fat:0.5,  fiber:1.8, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:8,  name:'Macarrão integral cozido',    category:'Cereais e grãos',       kcal:134, protein:5.3,  carbs:26.0, fat:0.8,  fiber:3.5, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:9,  name:'Tapioca (goma)',              category:'Cereais e grãos',       kcal:346, protein:0.2,  carbs:85.8, fat:0.0,  fiber:0.1, typical_amount:2,   typical_unit:'colher de sopa', unit_weight_g:15  },
  { id:10, name:'Quinoa cozida',               category:'Cereais e grãos',       kcal:120, protein:4.1,  carbs:21.3, fat:1.9,  fiber:2.8, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:11, name:'Farinha de aveia',            category:'Cereais e grãos',       kcal:394, protein:13.9, carbs:66.6, fat:8.5,  fiber:9.1, typical_amount:3,   typical_unit:'colher de sopa', unit_weight_g:10  },
  { id:12, name:'Cuscuz (milho) cozido',       category:'Cereais e grãos',       kcal:82,  protein:1.8,  carbs:17.2, fat:0.2,  fiber:0.9, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:13, name:'Granola tradicional',         category:'Cereais e grãos',       kcal:440, protein:9.0,  carbs:62.0, fat:18.0, fiber:5.4, typical_amount:4,   typical_unit:'colher de sopa', unit_weight_g:15  },
  { id:14, name:'Milho verde cozido',          category:'Cereais e grãos',       kcal:85,  protein:3.2,  carbs:16.2, fat:1.1,  fiber:2.0, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:15, name:'Mingau de aveia (s/açúcar)',  category:'Cereais e grãos',       kcal:60,  protein:2.5,  carbs:10.5, fat:1.0,  fiber:1.2, typical_amount:200, typical_unit:'ml',             unit_weight_g:1   },
  { id:16, name:'Torrada integral',            category:'Cereais e grãos',       kcal:367, protein:10.0, carbs:70.0, fat:4.0,  fiber:5.5, typical_amount:2,   typical_unit:'unidade',        unit_weight_g:10  },

  // ── Tubérculos ────────────────────────────────────────────
  { id:17, name:'Batata-doce cozida',          category:'Tubérculos',            kcal:77,  protein:0.6,  carbs:18.4, fat:0.1,  fiber:2.2, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:18, name:'Batata inglesa cozida',       category:'Tubérculos',            kcal:52,  protein:1.2,  carbs:11.3, fat:0.1,  fiber:1.8, typical_amount:150, typical_unit:'g',              unit_weight_g:1   },
  { id:19, name:'Mandioca cozida',             category:'Tubérculos',            kcal:125, protein:0.6,  carbs:30.1, fat:0.3,  fiber:1.9, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:20, name:'Inhame cozido',               category:'Tubérculos',            kcal:91,  protein:1.5,  carbs:20.9, fat:0.1,  fiber:1.0, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:21, name:'Cará cozido',                 category:'Tubérculos',            kcal:98,  protein:1.7,  carbs:22.5, fat:0.2,  fiber:2.5, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },

  // ── Proteínas animais ─────────────────────────────────────
  { id:22, name:'Peito de frango grelhado',    category:'Proteínas animais',     kcal:159, protein:32.0, carbs:0.0,  fat:2.5,  fiber:0.0, typical_amount:150, typical_unit:'g',              unit_weight_g:1   },
  { id:23, name:'Coxa de frango grelhada',     category:'Proteínas animais',     kcal:167, protein:26.1, carbs:0.0,  fat:6.8,  fiber:0.0, typical_amount:130, typical_unit:'g',              unit_weight_g:1   },
  { id:24, name:'Patinho bovino cozido',       category:'Proteínas animais',     kcal:219, protein:32.8, carbs:0.0,  fat:9.4,  fiber:0.0, typical_amount:120, typical_unit:'g',              unit_weight_g:1   },
  { id:25, name:'Alcatra grelhada',            category:'Proteínas animais',     kcal:209, protein:30.2, carbs:0.0,  fat:9.5,  fiber:0.0, typical_amount:120, typical_unit:'g',              unit_weight_g:1   },
  { id:26, name:'Atum em lata (água)',         category:'Proteínas animais',     kcal:132, protein:28.0, carbs:0.0,  fat:1.9,  fiber:0.0, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:27, name:'Sardinha em lata',            category:'Proteínas animais',     kcal:208, protein:24.1, carbs:0.0,  fat:11.5, fiber:0.0, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:28, name:'Salmão grelhado',             category:'Proteínas animais',     kcal:208, protein:22.1, carbs:0.0,  fat:13.0, fiber:0.0, typical_amount:130, typical_unit:'g',              unit_weight_g:1   },
  { id:29, name:'Tilápia grelhada',            category:'Proteínas animais',     kcal:96,  protein:20.1, carbs:0.0,  fat:1.5,  fiber:0.0, typical_amount:130, typical_unit:'g',              unit_weight_g:1   },
  { id:30, name:'Lombo suíno grelhado',        category:'Proteínas animais',     kcal:219, protein:28.0, carbs:0.0,  fat:11.8, fiber:0.0, typical_amount:120, typical_unit:'g',              unit_weight_g:1   },
  { id:31, name:'Peru grelhado',               category:'Proteínas animais',     kcal:157, protein:29.9, carbs:0.0,  fat:3.6,  fiber:0.0, typical_amount:120, typical_unit:'g',              unit_weight_g:1   },
  { id:32, name:'Camarão cozido',              category:'Proteínas animais',     kcal:99,  protein:20.3, carbs:0.9,  fat:1.1,  fiber:0.0, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:33, name:'Carne bovina moída cozida',   category:'Proteínas animais',     kcal:250, protein:26.5, carbs:0.0,  fat:15.5, fiber:0.0, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:34, name:'Peito de peru (fatiado)',     category:'Proteínas animais',     kcal:89,  protein:18.0, carbs:1.0,  fat:1.0,  fiber:0.0, typical_amount:2,   typical_unit:'fatia',          unit_weight_g:30  },

  // ── Ovos e derivados ──────────────────────────────────────
  { id:35, name:'Ovo de galinha cozido',       category:'Ovos e derivados',      kcal:146, protein:13.3, carbs:1.6,  fat:9.5,  fiber:0.0, typical_amount:2,   typical_unit:'unidade',        unit_weight_g:60  },
  { id:36, name:'Ovo mexido (c/ margarina)',   category:'Ovos e derivados',      kcal:169, protein:11.7, carbs:1.3,  fat:13.0, fiber:0.0, typical_amount:2,   typical_unit:'unidade',        unit_weight_g:60  },
  { id:37, name:'Clara de ovo cozida',         category:'Ovos e derivados',      kcal:52,  protein:11.1, carbs:0.7,  fat:0.2,  fiber:0.0, typical_amount:2,   typical_unit:'unidade',        unit_weight_g:35  },
  { id:38, name:'Ovo pochê',                   category:'Ovos e derivados',      kcal:138, protein:12.5, carbs:1.2,  fat:9.0,  fiber:0.0, typical_amount:1,   typical_unit:'unidade',        unit_weight_g:60  },

  // ── Leite e derivados ─────────────────────────────────────
  { id:39, name:'Leite integral',              category:'Leite e derivados',     kcal:61,  protein:3.2,  carbs:4.5,  fat:3.2,  fiber:0.0, typical_amount:200, typical_unit:'ml',             unit_weight_g:1   },
  { id:40, name:'Leite desnatado',             category:'Leite e derivados',     kcal:35,  protein:3.5,  carbs:5.1,  fat:0.1,  fiber:0.0, typical_amount:200, typical_unit:'ml',             unit_weight_g:1   },
  { id:41, name:'Leite semidesnatado',         category:'Leite e derivados',     kcal:46,  protein:3.3,  carbs:4.8,  fat:1.5,  fiber:0.0, typical_amount:200, typical_unit:'ml',             unit_weight_g:1   },
  { id:42, name:'Iogurte natural integral',    category:'Leite e derivados',     kcal:66,  protein:3.8,  carbs:5.6,  fat:3.2,  fiber:0.0, typical_amount:150, typical_unit:'g',              unit_weight_g:1   },
  { id:43, name:'Iogurte natural desnatado',   category:'Leite e derivados',     kcal:43,  protein:4.1,  carbs:6.1,  fat:0.2,  fiber:0.0, typical_amount:150, typical_unit:'g',              unit_weight_g:1   },
  { id:44, name:'Iogurte grego integral',      category:'Leite e derivados',     kcal:133, protein:9.1,  carbs:5.4,  fat:8.0,  fiber:0.0, typical_amount:150, typical_unit:'g',              unit_weight_g:1   },
  { id:45, name:'Queijo mussarela',            category:'Leite e derivados',     kcal:264, protein:19.8, carbs:2.5,  fat:20.1, fiber:0.0, typical_amount:30,  typical_unit:'g',              unit_weight_g:1   },
  { id:46, name:'Queijo cottage',              category:'Leite e derivados',     kcal:98,  protein:11.5, carbs:3.4,  fat:4.3,  fiber:0.0, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:47, name:'Queijo prato',                category:'Leite e derivados',     kcal:360, protein:25.6, carbs:1.6,  fat:28.1, fiber:0.0, typical_amount:30,  typical_unit:'g',              unit_weight_g:1   },
  { id:48, name:'Requeijão cremoso',           category:'Leite e derivados',     kcal:261, protein:9.9,  carbs:5.8,  fat:21.8, fiber:0.0, typical_amount:1,   typical_unit:'colher de sopa', unit_weight_g:15  },
  { id:49, name:'Cream cheese',               category:'Leite e derivados',     kcal:342, protein:7.0,  carbs:3.0,  fat:33.0, fiber:0.0, typical_amount:1,   typical_unit:'colher de sopa', unit_weight_g:15  },
  { id:50, name:'Bebida vegetal de soja',      category:'Leite e derivados',     kcal:47,  protein:3.4,  carbs:4.0,  fat:1.8,  fiber:0.6, typical_amount:200, typical_unit:'ml',             unit_weight_g:1   },
  { id:51, name:'Bebida vegetal de amêndoa',   category:'Leite e derivados',     kcal:24,  protein:0.4,  carbs:3.3,  fat:1.1,  fiber:0.4, typical_amount:200, typical_unit:'ml',             unit_weight_g:1   },

  // ── Leguminosas ───────────────────────────────────────────
  { id:52, name:'Feijão preto cozido',         category:'Leguminosas',           kcal:77,  protein:4.5,  carbs:14.0, fat:0.5,  fiber:8.4, typical_amount:1,   typical_unit:'xícara',         unit_weight_g:200 },
  { id:53, name:'Feijão carioca cozido',       category:'Leguminosas',           kcal:76,  protein:4.8,  carbs:13.6, fat:0.5,  fiber:8.5, typical_amount:1,   typical_unit:'xícara',         unit_weight_g:200 },
  { id:54, name:'Lentilha cozida',             category:'Leguminosas',           kcal:93,  protein:6.3,  carbs:16.8, fat:0.5,  fiber:3.7, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:55, name:'Grão-de-bico cozido',         category:'Leguminosas',           kcal:164, protein:8.9,  carbs:27.4, fat:2.6,  fiber:6.2, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:56, name:'Ervilha cozida',              category:'Leguminosas',           kcal:78,  protein:5.4,  carbs:13.7, fat:0.4,  fiber:5.0, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:57, name:'Edamame cozido',              category:'Leguminosas',           kcal:121, protein:11.9, carbs:8.9,  fat:5.2,  fiber:5.1, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:58, name:'Soja cozida',                 category:'Leguminosas',           kcal:141, protein:14.3, carbs:11.5, fat:6.1,  fiber:6.4, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },

  // ── Verduras e legumes ────────────────────────────────────
  { id:59, name:'Brócolis cozido',             category:'Verduras e legumes',    kcal:35,  protein:2.9,  carbs:4.4,  fat:0.4,  fiber:3.3, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:60, name:'Couve refogada',              category:'Verduras e legumes',    kcal:37,  protein:2.5,  carbs:3.9,  fat:1.9,  fiber:2.0, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:61, name:'Espinafre cozido',            category:'Verduras e legumes',    kcal:23,  protein:2.2,  carbs:2.0,  fat:0.3,  fiber:2.4, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:62, name:'Tomate cru',                  category:'Verduras e legumes',    kcal:18,  protein:0.9,  carbs:3.7,  fat:0.1,  fiber:1.2, typical_amount:1,   typical_unit:'unidade',        unit_weight_g:100 },
  { id:63, name:'Alface crua',                 category:'Verduras e legumes',    kcal:11,  protein:1.3,  carbs:1.0,  fat:0.2,  fiber:1.8, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:64, name:'Cenoura crua',                category:'Verduras e legumes',    kcal:34,  protein:1.3,  carbs:6.9,  fat:0.2,  fiber:3.2, typical_amount:1,   typical_unit:'unidade',        unit_weight_g:80  },
  { id:65, name:'Abobrinha cozida',            category:'Verduras e legumes',    kcal:26,  protein:1.1,  carbs:4.3,  fat:0.3,  fiber:1.6, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:66, name:'Berinjela cozida',            category:'Verduras e legumes',    kcal:24,  protein:0.8,  carbs:4.4,  fat:0.2,  fiber:2.5, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:67, name:'Pepino cru',                  category:'Verduras e legumes',    kcal:10,  protein:0.8,  carbs:1.5,  fat:0.1,  fiber:0.8, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:68, name:'Beterraba cozida',            category:'Verduras e legumes',    kcal:39,  protein:1.7,  carbs:7.7,  fat:0.1,  fiber:2.0, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:69, name:'Chuchu cozido',               category:'Verduras e legumes',    kcal:19,  protein:0.9,  carbs:2.7,  fat:0.3,  fiber:2.5, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:70, name:'Couve-flor cozida',           category:'Verduras e legumes',    kcal:20,  protein:2.0,  carbs:2.2,  fat:0.2,  fiber:2.4, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:71, name:'Pimentão vermelho cru',       category:'Verduras e legumes',    kcal:28,  protein:1.0,  carbs:6.0,  fat:0.3,  fiber:2.1, typical_amount:1,   typical_unit:'unidade',        unit_weight_g:150 },
  { id:72, name:'Vagem cozida',                category:'Verduras e legumes',    kcal:31,  protein:2.1,  carbs:5.0,  fat:0.2,  fiber:3.2, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:73, name:'Aspargo cozido',              category:'Verduras e legumes',    kcal:20,  protein:2.2,  carbs:2.2,  fat:0.2,  fiber:2.0, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:74, name:'Quiabo cozido',               category:'Verduras e legumes',    kcal:40,  protein:2.0,  carbs:7.0,  fat:0.2,  fiber:4.1, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:75, name:'Milho verde cru',             category:'Verduras e legumes',    kcal:75,  protein:2.5,  carbs:16.0, fat:1.0,  fiber:2.0, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },

  // ── Frutas ────────────────────────────────────────────────
  { id:76, name:'Banana nanica',               category:'Frutas',                kcal:92,  protein:1.4,  carbs:23.8, fat:0.1,  fiber:1.9, typical_amount:1,   typical_unit:'unidade',        unit_weight_g:100 },
  { id:77, name:'Maçã',                        category:'Frutas',                kcal:56,  protein:0.3,  carbs:15.2, fat:0.1,  fiber:2.0, typical_amount:1,   typical_unit:'unidade',        unit_weight_g:130 },
  { id:78, name:'Laranja pêra',                category:'Frutas',                kcal:47,  protein:0.9,  carbs:11.5, fat:0.1,  fiber:2.4, typical_amount:1,   typical_unit:'unidade',        unit_weight_g:130 },
  { id:79, name:'Mamão papaia',                category:'Frutas',                kcal:40,  protein:0.5,  carbs:10.4, fat:0.1,  fiber:1.8, typical_amount:200, typical_unit:'g',              unit_weight_g:1   },
  { id:80, name:'Abacaxi',                     category:'Frutas',                kcal:48,  protein:0.9,  carbs:12.4, fat:0.1,  fiber:1.0, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:81, name:'Uva',                         category:'Frutas',                kcal:70,  protein:0.7,  carbs:17.9, fat:0.4,  fiber:0.9, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:82, name:'Morango',                     category:'Frutas',                kcal:30,  protein:0.8,  carbs:7.1,  fat:0.3,  fiber:2.0, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:83, name:'Melão amarelo',               category:'Frutas',                kcal:29,  protein:0.9,  carbs:6.5,  fat:0.2,  fiber:0.3, typical_amount:150, typical_unit:'g',              unit_weight_g:1   },
  { id:84, name:'Melancia',                    category:'Frutas',                kcal:33,  protein:0.8,  carbs:7.9,  fat:0.2,  fiber:0.4, typical_amount:200, typical_unit:'g',              unit_weight_g:1   },
  { id:85, name:'Abacate',                     category:'Frutas',                kcal:96,  protein:1.2,  carbs:6.0,  fat:8.4,  fiber:6.3, typical_amount:100, typical_unit:'g',              unit_weight_g:1   },
  { id:86, name:'Manga Tommy',                 category:'Frutas',                kcal:64,  protein:0.7,  carbs:16.8, fat:0.3,  fiber:1.6, typical_amount:130, typical_unit:'g',              unit_weight_g:1   },
  { id:87, name:'Pêra',                        category:'Frutas',                kcal:55,  protein:0.7,  carbs:15.5, fat:0.1,  fiber:3.0, typical_amount:1,   typical_unit:'unidade',        unit_weight_g:130 },
  { id:88, name:'Goiaba',                      category:'Frutas',                kcal:54,  protein:2.6,  carbs:9.5,  fat:0.9,  fiber:6.2, typical_amount:1,   typical_unit:'unidade',        unit_weight_g:100 },
  { id:89, name:'Kiwi',                        category:'Frutas',                kcal:61,  protein:1.1,  carbs:14.7, fat:0.5,  fiber:3.0, typical_amount:1,   typical_unit:'unidade',        unit_weight_g:70  },
  { id:90, name:'Tangerina',                   category:'Frutas',                kcal:38,  protein:0.8,  carbs:9.3,  fat:0.1,  fiber:1.8, typical_amount:1,   typical_unit:'unidade',        unit_weight_g:90  },
  { id:91, name:'Ameixa fresca',               category:'Frutas',                kcal:46,  protein:0.7,  carbs:11.4, fat:0.3,  fiber:1.4, typical_amount:2,   typical_unit:'unidade',        unit_weight_g:50  },
  { id:92, name:'Coco fresco (polpa)',         category:'Frutas',                kcal:354, protein:3.4,  carbs:15.2, fat:34.0, fiber:9.0, typical_amount:30,  typical_unit:'g',              unit_weight_g:1   },

  // ── Gorduras e óleos ──────────────────────────────────────
  { id:93, name:'Azeite de oliva',             category:'Gorduras e óleos',      kcal:884, protein:0.0,  carbs:0.0,  fat:100.0,fiber:0.0, typical_amount:1,   typical_unit:'colher de sopa', unit_weight_g:14  },
  { id:94, name:'Óleo de coco',                category:'Gorduras e óleos',      kcal:862, protein:0.0,  carbs:0.0,  fat:100.0,fiber:0.0, typical_amount:1,   typical_unit:'colher de sopa', unit_weight_g:14  },
  { id:95, name:'Manteiga',                    category:'Gorduras e óleos',      kcal:726, protein:0.9,  carbs:0.0,  fat:81.0, fiber:0.0, typical_amount:1,   typical_unit:'colher de chá',  unit_weight_g:5   },
  { id:96, name:'Margarina cremosa',           category:'Gorduras e óleos',      kcal:541, protein:0.7,  carbs:0.6,  fat:60.0, fiber:0.0, typical_amount:1,   typical_unit:'colher de chá',  unit_weight_g:5   },
  { id:97, name:'Azeite de gergelim',          category:'Gorduras e óleos',      kcal:884, protein:0.0,  carbs:0.0,  fat:100.0,fiber:0.0, typical_amount:1,   typical_unit:'colher de chá',  unit_weight_g:5   },

  // ── Oleaginosas e sementes ────────────────────────────────
  { id:98, name:'Amendoim torrado s/sal',      category:'Oleaginosas e sementes',kcal:596, protein:28.1, carbs:17.8, fat:47.5, fiber:8.0, typical_amount:30,  typical_unit:'g',              unit_weight_g:1   },
  { id:99, name:'Castanha-do-Pará',            category:'Oleaginosas e sementes',kcal:656, protein:14.3, carbs:15.1, fat:63.5, fiber:5.4, typical_amount:2,   typical_unit:'unidade',        unit_weight_g:5   },
  { id:100,name:'Castanha de caju torrada',    category:'Oleaginosas e sementes',kcal:570, protein:18.5, carbs:29.1, fat:46.3, fiber:3.7, typical_amount:30,  typical_unit:'g',              unit_weight_g:1   },
  { id:101,name:'Amêndoa torrada s/sal',       category:'Oleaginosas e sementes',kcal:581, protein:21.2, carbs:19.7, fat:49.4, fiber:12.5,typical_amount:30,  typical_unit:'g',              unit_weight_g:1   },
  { id:102,name:'Pasta de amendoim integral',  category:'Oleaginosas e sementes',kcal:593, protein:25.1, carbs:22.3, fat:46.7, fiber:6.0, typical_amount:2,   typical_unit:'colher de sopa', unit_weight_g:15  },
  { id:103,name:'Semente de chia',             category:'Oleaginosas e sementes',kcal:489, protein:16.5, carbs:42.1, fat:30.7, fiber:34.4,typical_amount:1,   typical_unit:'colher de sopa', unit_weight_g:12  },
  { id:104,name:'Semente de linhaça dourada',  category:'Oleaginosas e sementes',kcal:489, protein:18.3, carbs:28.9, fat:42.2, fiber:27.3,typical_amount:1,   typical_unit:'colher de sopa', unit_weight_g:10  },
  { id:105,name:'Semente de girassol',         category:'Oleaginosas e sementes',kcal:601, protein:20.8, carbs:20.0, fat:52.0, fiber:6.0, typical_amount:2,   typical_unit:'colher de sopa', unit_weight_g:12  },
  { id:106,name:'Gergelim branco',             category:'Oleaginosas e sementes',kcal:592, protein:18.2, carbs:23.4, fat:50.0, fiber:6.5, typical_amount:1,   typical_unit:'colher de sopa', unit_weight_g:10  },
  { id:107,name:'Nozes',                       category:'Oleaginosas e sementes',kcal:660, protein:15.2, carbs:14.1, fat:65.2, fiber:6.7, typical_amount:4,   typical_unit:'unidade',        unit_weight_g:5   },

  // ── Açúcares e adoçantes ──────────────────────────────────
  { id:108,name:'Mel',                         category:'Açúcares e adoçantes',  kcal:309, protein:0.3,  carbs:82.4, fat:0.0,  fiber:0.2, typical_amount:1,   typical_unit:'colher de sopa', unit_weight_g:15  },
  { id:109,name:'Açúcar demerara',             category:'Açúcares e adoçantes',  kcal:380, protein:0.0,  carbs:97.6, fat:0.0,  fiber:0.0, typical_amount:1,   typical_unit:'colher de chá',  unit_weight_g:5   },
  { id:110,name:'Açúcar refinado',             category:'Açúcares e adoçantes',  kcal:387, protein:0.0,  carbs:99.6, fat:0.0,  fiber:0.0, typical_amount:1,   typical_unit:'colher de chá',  unit_weight_g:5   },
  { id:111,name:'Geleia (fruta)',              category:'Açúcares e adoçantes',  kcal:250, protein:0.4,  carbs:65.4, fat:0.0,  fiber:0.5, typical_amount:1,   typical_unit:'colher de chá',  unit_weight_g:10  },

  // ── Bebidas ───────────────────────────────────────────────
  { id:112,name:'Suco de laranja natural',     category:'Bebidas',               kcal:45,  protein:0.7,  carbs:10.4, fat:0.2,  fiber:0.3, typical_amount:200, typical_unit:'ml',             unit_weight_g:1   },
  { id:113,name:'Café preto s/açúcar',         category:'Bebidas',               kcal:2,   protein:0.3,  carbs:0.3,  fat:0.0,  fiber:0.0, typical_amount:200, typical_unit:'ml',             unit_weight_g:1   },
  { id:114,name:'Chá verde (infusão)',         category:'Bebidas',               kcal:1,   protein:0.0,  carbs:0.2,  fat:0.0,  fiber:0.0, typical_amount:200, typical_unit:'ml',             unit_weight_g:1   },
  { id:115,name:'Água de coco',                category:'Bebidas',               kcal:19,  protein:0.7,  carbs:3.7,  fat:0.2,  fiber:1.1, typical_amount:200, typical_unit:'ml',             unit_weight_g:1   },

  // ── Suplementos ───────────────────────────────────────────
  { id:116,name:'Whey protein (concentrado)', category:'Suplementos',           kcal:380, protein:75.0, carbs:12.0, fat:5.0,  fiber:0.5, typical_amount:30,  typical_unit:'g',              unit_weight_g:1   },
  { id:117,name:'Whey protein (isolado)',     category:'Suplementos',           kcal:370, protein:90.0, carbs:2.0,  fat:1.0,  fiber:0.0, typical_amount:30,  typical_unit:'g',              unit_weight_g:1   },
  { id:118,name:'Proteína vegetal de ervilha',category:'Suplementos',           kcal:370, protein:80.0, carbs:8.0,  fat:3.5,  fiber:1.0, typical_amount:30,  typical_unit:'g',              unit_weight_g:1   },
  { id:119,name:'Colágeno hidrolisado',       category:'Suplementos',           kcal:350, protein:85.0, carbs:0.0,  fat:1.0,  fiber:0.0, typical_amount:10,  typical_unit:'g',              unit_weight_g:1   },
  { id:120,name:'Maltodextrina',              category:'Suplementos',           kcal:380, protein:0.0,  carbs:95.0, fat:0.0,  fiber:0.0, typical_amount:30,  typical_unit:'g',              unit_weight_g:1   },
]

/** Busca por nome (case-insensitive) */
export function searchFoods(q: string, limit = 12): TacoFood[] {
  if (!q || q.trim().length < 2) return []
  const lower = q.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  return TACO
    .filter(f => {
      const name = f.name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
      return name.includes(lower)
    })
    .slice(0, limit)
}

/** Substituições: mesma categoria, kcal similares (±40%) */
export function getSubstitutions(foodId: number, limit = 5): TacoFood[] {
  const food = TACO.find(f => f.id === foodId)
  if (!food) return []
  const min = food.kcal * 0.6
  const max = food.kcal * 1.4
  return TACO
    .filter(f => f.id !== foodId && f.category === food.category && f.kcal >= min && f.kcal <= max)
    .sort((a, b) => {
      // Prioriza similaridade de proteína para alimentos proteicos
      if (food.protein > 10) {
        return Math.abs(a.protein - food.protein) - Math.abs(b.protein - food.protein)
      }
      return Math.abs(a.kcal - food.kcal) - Math.abs(b.kcal - food.kcal)
    })
    .slice(0, limit)
}
