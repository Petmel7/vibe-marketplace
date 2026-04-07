import ProductCard from "@/components/product/ProductCard";

export default function Home() {
  const mockProduct = {
    name: "Футболка Vibe Run",
    price: 2500.50,
    imageUrl: "/images/t-shirt.png",
    sku: "3495",
    isActive: true,
    isHit: false,
    isNew: true,
  };
  return (
    <>
      <ProductCard
        name={mockProduct.name}
        price={Number(mockProduct.price)}
        imageUrl={mockProduct.imageUrl || "/placeholder.png"}
        sku={mockProduct.sku}
        isActive={mockProduct.isActive}
        isHit={mockProduct.isHit}
        isNew={mockProduct.isNew}
      />
    </>
  );
}
