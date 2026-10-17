import type { Product } from "@/types/product";

// Visual development fixtures only. Replace by connecting lib/api/products.ts to Xano.
export const fixtureProducts: Product[] = [
  { id: "banana", name: "Банана", category: "fruit", price: 80, unit: "кг", imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=720&q=85", is_available: true, displayOrder: 1 },
  { id: "orange", name: "Портокал", category: "fruit", price: 80, unit: "кг", imageUrl: "https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=720&q=85", is_available: true, displayOrder: 2 },
  { id: "lemon", name: "Лимон", category: "fruit", price: 80, unit: "кг", imageUrl: "https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&w=720&q=85", is_available: true, displayOrder: 3 },
  { id: "grapes", name: "Грозје", category: "fruit", price: 130, unit: "кг", imageUrl: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=720&q=85", is_available: true, displayOrder: 4 },
  { id: "apple", name: "Јаболко", category: "fruit", price: 60, unit: "кг", imageUrl: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=720&q=85", is_available: true, displayOrder: 5 },
  { id: "mandarin", name: "Мандарина", category: "fruit", price: 100, unit: "кг", imageUrl: "https://images.unsplash.com/photo-1609424572698-04d9d2e04954?auto=format&fit=crop&w=720&q=85", is_available: true, salePrice: 85, displayOrder: 6 },
  { id: "kiwi", name: "Киви", category: "fruit", price: 150, unit: "кг", imageUrl: "https://images.unsplash.com/photo-1585059895524-72359e06133a?auto=format&fit=crop&w=720&q=85", is_available: false, displayOrder: 7 },
  { id: "tomato", name: "Домат", category: "vegetable", price: 100, unit: "кг", imageUrl: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=720&q=85", is_available: true, salePrice: 80, displayOrder: 8 },
  { id: "pepper", name: "Црвена пиперка", category: "vegetable", price: 90, unit: "кг", imageUrl: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=720&q=85", is_available: true, displayOrder: 9 },
  { id: "cucumber", name: "Краставица", category: "vegetable", price: 70, unit: "кг", imageUrl: "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=720&q=85", is_available: true, displayOrder: 10 },
  { id: "carrot", name: "Морков", category: "vegetable", price: 55, unit: "кг", imageUrl: "https://images.unsplash.com/photo-1445282768818-728615cc910a?auto=format&fit=crop&w=720&q=85", is_available: true, displayOrder: 11 },
  { id: "lettuce", name: "Марула", category: "vegetable", price: 50, unit: "парче", imageUrl: "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=720&h=540&q=75&crop=entropy", is_available: false, displayOrder: 12 },
];
