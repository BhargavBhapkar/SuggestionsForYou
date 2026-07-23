import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Retailer from "../models/Retailer.js";
import Testimonial from "../models/Testimonial.js";
import Faq from "../models/Faq.js";
import { CATEGORIES, RETAILERS, TESTIMONIALS, FAQS, buildProducts } from "./seedData.js";

export async function runSeed(): Promise<void> {
  console.log("[seed] Clearing existing collections...");
  await Promise.all([
    Product.deleteMany({}),
    Category.deleteMany({}),
    Retailer.deleteMany({}),
    Testimonial.deleteMany({}),
    Faq.deleteMany({}),
  ]);

  console.log("[seed] Inserting categories, retailers, testimonials, faqs...");
  await Category.insertMany(CATEGORIES);
  await Retailer.insertMany(RETAILERS);
  await Testimonial.insertMany(TESTIMONIALS);
  await Faq.insertMany(FAQS);

  console.log("[seed] Inserting products...");
  const products = buildProducts();
  await Product.insertMany(products);

  console.log(
    `[seed] Done. Inserted ${products.length} products, ${CATEGORIES.length} categories, ${RETAILERS.length} retailers, ${TESTIMONIALS.length} testimonials, ${FAQS.length} faqs.`,
  );
}
