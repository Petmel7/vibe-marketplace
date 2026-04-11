
import ProductCard from "@/components/product/ProductCard";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const products = await prisma.product.findMany({
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
          price={Number(product.price)}
          imageUrl={product.imageUrl || "/placeholder.png"}
          sku={product.sku || undefined}
          isActive={product.isActive}
          isHit={product.isHit}
          isNew={product.isNew}
        />
      ))}
    </div>
  );
}
