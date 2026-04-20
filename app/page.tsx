
import ProductCard from "@/components/product/ProductCard";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      price: true,
      imageUrl: true,
      sku: true,
      isActive: true,
      isHit: true,
      isNew: true,
      variants: {
        select: {
          id: true,
          sku: true,
          price: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="grid grid-cols-1 min-[375px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mx-auto">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          name={product.name}
          imageUrl={product.imageUrl || "/placeholder.png"}
          isActive={product.isActive}
          isHit={product.isHit}
          isNew={product.isNew}
          product={{
            price: product.price.toString(),
            sku: product.sku,
            variants: product.variants.map((variant) => ({
              id: variant.id,
              sku: variant.sku,
              price: variant.price != null ? variant.price.toString() : null,
            })),
          }}
        />
      ))}
    </div>
  );
}
