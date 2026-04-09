export interface AmazonBestSellerRecord {
    title: string;
    seller_name: string | null;
    brand: string;
    description: string | null;
    initial_price: number | null;
    final_price: number | null;
    final_price_high: number | null;
    currency: string;
    availability: string;
    reviews_count: number;
    categories: string[][] | null;
    asin: string;
    buybox_seller: string;
    number_of_sellers: number;
    root_bs_rank: number;
    ISBN10: string | null;
    answered_questions: number;
    domain: string;
    images_count: number;
    url: string;
    video_count: number;
    image_url: string;
    item_weight: string | null;
    rating: number;
    product_dimensions: string | null;
    seller_id: string;
    image: string;
    date_first_available: string | null;
    discount: string | null;
    model_number: string | null;
    manufacturer: string | null;
    department: string | null;
    plus_content: boolean;
    upc: string | null;
    video: boolean;
    top_review: string | null;
    variations: AmazonVariation[] | null;
    delivery: string[] | null;
    features: string[] | null;
    buybox_prices: AmazonBuyboxPrices | null;
    origin_url: string | null;
    bs_rank: number | null;
    bs_rank_category: string | null;
    sponsered: boolean | null;
}

export interface AmazonVariation {
    asin: string;
    name: string;
}

export interface AmazonBuyboxPrices {
    final_price: number | null;
    initial_price: number | null;
    discount: string | null;
    sns_price: AmazonSnsPrice | null;
    monthly_cost: number | null;
}

export interface AmazonSnsPrice {
    base_price: number | null;
    tiered_price: number | null;
}
