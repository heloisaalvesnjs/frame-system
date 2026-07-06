export const CATEGORY_STYLE = {
  carboidratos: { emoji: "🍞", bgDark: "#2A2010", colorDark: "#F5C842", bgLight: "#FFF8E1", colorLight: "#8A6D1A", label: "Carboidratos" },
  proteinas:    { emoji: "🍗", bgDark: "#261510", colorDark: "#E8824A", bgLight: "#FBE9E7", colorLight: "#B5461F", label: "Proteínas" },
  gorduras:     { emoji: "🥑", bgDark: "#1A2010", colorDark: "#A8F13C", bgLight: "#F1F8E9", colorLight: "#4C7A1F", label: "Gorduras" },
  frutas:       { emoji: "🍓", bgDark: "#26101A", colorDark: "#F06292", bgLight: "#FCE4EC", colorLight: "#AD1457", label: "Frutas" },
  vegetais:     { emoji: "🥦", bgDark: "#0F2118", colorDark: "#61D836", bgLight: "#E8F5E9", colorLight: "#2E7D32", label: "Vegetais" },
  laticinios:   { emoji: "🥛", bgDark: "#1A1E26", colorDark: "#90CAF9", bgLight: "#E3F2FD", colorLight: "#1565C0", label: "Laticínios" },
  outros:       { emoji: "🫙", bgDark: "#1B211E", colorDark: "#9BA39A", bgLight: "#EEF0EA", colorLight: "#5F675E", label: "Outros" },
} as const;

export type FoodCategory = keyof typeof CATEGORY_STYLE;

const PROTEIN_KEYWORDS = ["carne", "boi", "frango", "peixe", "ovo", "pato", "peru", "camarão", "atum", "sardinha", "salmão", "tilápia", "linguiça", "bacon", "presunto", "proteína", "whey"];
const CARB_KEYWORDS = ["arroz", "pão", "macarrão", "batata", "mandioca", "tapioca", "milho", "aveia", "cereal", "biscoito", "bolacha", "farinha", "trigo", "cuscuz", "inhame"];
const FAT_KEYWORDS = ["óleo", "azeite", "manteiga", "abacate", "castanha", "amendoim", "nozes", "semente", "banha", "gordura", "margarina", "creme"];
const FRUIT_KEYWORDS = ["fruta", "banana", "maçã", "laranja", "uva", "morango", "melão", "melancia", "manga", "abacaxi", "mamão", "pêra", "pêssego", "caju", "goiaba", "limão", "kiwi", "ameixa", "cereja"];
const VEGGIE_KEYWORDS = ["verdura", "legume", "alface", "espinafre", "couve", "brócolis", "cenoura", "tomate", "pepino", "cebola", "alho", "abobrinha", "berinjela", "chuchu", "vagem", "pimentão", "repolho", "beterraba"];
const DAIRY_KEYWORDS = ["leite", "queijo", "iogurte", "requeijão", "ricota", "mussarela", "creme de leite", "nata"];

export function categorize(food: { name: string; category: string }): FoodCategory {
  const text = `${food.name} ${food.category}`.toLowerCase();
  if (DAIRY_KEYWORDS.some((k) => text.includes(k))) return "laticinios";
  if (PROTEIN_KEYWORDS.some((k) => text.includes(k))) return "proteinas";
  if (CARB_KEYWORDS.some((k) => text.includes(k))) return "carboidratos";
  if (FAT_KEYWORDS.some((k) => text.includes(k))) return "gorduras";
  if (FRUIT_KEYWORDS.some((k) => text.includes(k))) return "frutas";
  if (VEGGIE_KEYWORDS.some((k) => text.includes(k))) return "vegetais";
  return "outros";
}
