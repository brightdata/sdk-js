import { Transport, assertResponse } from '../../core/transport';
import { API_ENDPOINT } from '../../utils/constants';
import { parseJSON } from '../../utils/misc';
import { getLogger } from '../../utils/logger';
import { BaseDataset } from './base';
import type { DatasetInfo } from './types';
import {
    LinkedinProfilesDataset,
    LinkedinCompaniesDataset,
    LinkedinJobListingsDataset,
    LinkedinPostsDataset,
    LinkedinProfilesJobListingsDataset,
} from './platforms/linkedin';
import {
    AmazonProductsDataset,
    AmazonReviewsDataset,
    AmazonSellersDataset,
    AmazonBestSellersDataset,
    AmazonProductsSearchDataset,
    AmazonProductsGlobalDataset,
    AmazonWalmartDataset,
} from './platforms/amazon';
import {
    InstagramProfilesDataset,
    InstagramPostsDataset,
    InstagramCommentsDataset,
    InstagramReelsDataset,
} from './platforms/instagram';
import {
    TiktokProfilesDataset,
    TiktokPostsDataset,
    TiktokCommentsDataset,
    TiktokShopDataset,
} from './platforms/tiktok';
import {
    XTwitterPostsDataset,
    XTwitterProfilesDataset,
} from './platforms/x_twitter';
import { AgodaPropertiesDataset } from './platforms/agoda';
import { AirbnbPropertiesDataset } from './platforms/airbnb';
import { AmericanEagleProductsDataset } from './platforms/american_eagle';
import {
    AppleAppStoreDataset,
    AppleAppStoreReviewsDataset,
} from './platforms/apple';
import { AsosProductsDataset } from './platforms/asos';
import { AshleyFurnitureProductsDataset } from './platforms/ashley_furniture';
import { AustraliaRealEstateDataset } from './platforms/australia_real_estate';
import { AutozoneProductsDataset } from './platforms/autozone';
import { BalenciagaProductsDataset } from './platforms/balenciaga';
import { BbcNewsDataset } from './platforms/bbc';
import { BerlutiProductsDataset } from './platforms/berluti';
import { BestBuyProductsDataset } from './platforms/bestbuy';
import { BhProductsDataset } from './platforms/bh';
import {
    BlueskyPostsDataset,
    BlueskyTopProfilesDataset,
} from './platforms/bluesky';
import {
    BookingHotelListingsDataset,
    BookingListingsSearchDataset,
} from './platforms/booking';
import { BottegaVenetaProductsDataset } from './platforms/bottega_veneta';
import { CarsalesListingsDataset } from './platforms/carsales';
import { CartersProductsDataset } from './platforms/carters';
import { CelineProductsDataset } from './platforms/celine';
import { ChanelProductsDataset } from './platforms/chanel';
import { ChileautosChileDataset } from './platforms/chileautos';
import { CnnNewsDataset } from './platforms/cnn';
import { CompaniesEnrichedDataset } from './platforms/companies_enriched';
import { CostcoProductsDataset } from './platforms/costco';
import { CrateAndBarrelProductsDataset } from './platforms/crate_and_barrel';
import {
    CreativeCommons3dModelsDataset,
    CreativeCommonsImagesDataset,
} from './platforms/creative_commons';
import { CrunchbaseCompaniesDataset } from './platforms/crunchbase';
import { DelvauxProductsDataset } from './platforms/delvaux';
import { DigikeyProductsDataset } from './platforms/digikey';
import { DiorProductsDataset } from './platforms/dior';
import { EbayProductsDataset } from './platforms/ebay';
import { EmployeesEnrichedDataset } from './platforms/employees_enriched';
import { EtsyProductsDataset } from './platforms/etsy';
import {
    FacebookCommentsDataset,
    FacebookCompanyReviewsDataset,
    FacebookEventsDataset,
    FacebookGroupPostsDataset,
    FacebookMarketplaceDataset,
    FacebookPagesPostsDataset,
    FacebookPagesProfilesDataset,
    FacebookPostsByUrlDataset,
    FacebookProfilesDataset,
    FacebookReelsDataset,
} from './platforms/facebook';
import { FanaticsProductsDataset } from './platforms/fanatics';
import { FendiProductsDataset } from './platforms/fendi';
import { G2ProductsDataset, G2ReviewsDataset } from './platforms/g2';
import { GithubRepositoriesDataset } from './platforms/github';
import {
    GlassdoorCompaniesDataset,
    GlassdoorJobsDataset,
    GlassdoorReviewsDataset,
} from './platforms/glassdoor';
import { GoodreadsBooksDataset } from './platforms/goodreads';
import {
    GoogleMapsFullInfoDataset,
    GoogleMapsReviewsDataset,
} from './platforms/google_maps';
import { GoogleNewsDataset } from './platforms/google_news';
import {
    GooglePlayReviewsDataset,
    GooglePlayStoreDataset,
} from './platforms/google_play';
import {
    GoogleShoppingProductsDataset,
    GoogleShoppingSearchUsDataset,
} from './platforms/google_shopping';
import { HermesProductsDataset } from './platforms/hermes';
import { HmProductsDataset } from './platforms/hm';
import {
    HomeDepotCaProductsDataset,
    HomeDepotUsProductsDataset,
} from './platforms/home_depot';
import { IkeaProductsDataset } from './platforms/ikea';
import { ImdbMoviesDataset } from './platforms/imdb';
import {
    IndeedCompaniesDataset,
    IndeedJobsDataset,
} from './platforms/indeed';
import { InfocasasUruguayDataset } from './platforms/infocasas';
import { Inmuebles24MexicoDataset } from './platforms/inmuebles24';
import { KrogerProductsDataset } from './platforms/kroger';
import {
    LazadaProductsDataset,
    LazadaProductsSearchDataset,
    LazadaReviewsDataset,
} from './platforms/lazada';
import { LaZBoyProductsDataset } from './platforms/lazboy';
import { LegoProductsDataset } from './platforms/lego';
import { LlBeanProductsDataset } from './platforms/llbean';
import { LoeweProductsDataset } from './platforms/loewe';
import { LowesProductsDataset } from './platforms/lowes';
import { MacysProductsDataset } from './platforms/macys';
import { MangoProductsDataset } from './platforms/mango';
import { MantaBusinessesDataset } from './platforms/manta';
import { MassimoDuttiProductsDataset } from './platforms/massimo_dutti';
import { MattressFirmProductsDataset } from './platforms/mattress_firm';
import { MediamarktProductsDataset } from './platforms/mediamarkt';
import { MercadolivreProductsDataset } from './platforms/mercadolivre';
import { MetrocuadradoPropertiesDataset } from './platforms/metrocuadrado';
import { MicroCenterProductsDataset } from './platforms/microcenter';
import { MontblancProductsDataset } from './platforms/montblanc';
import { MouserProductsDataset } from './platforms/mouser';
import { MoynatProductsDataset } from './platforms/moynat';
import { MybobsProductsDataset } from './platforms/mybobs';
import { MyntraProductsDataset } from './platforms/myntra';
import { NaverProductsDataset } from './platforms/naver';
import { NbaPlayersStatsDataset } from './platforms/nba';
import { OlxBrazilDataset } from './platforms/olx';
import { OtodomPolandDataset } from './platforms/otodom';
import { OwlerCompaniesDataset } from './platforms/owler';
import { OzonProductsDataset } from './platforms/ozon';
import {
    PinterestPostsDataset,
    PinterestProfilesDataset,
} from './platforms/pinterest';
import { PitchBookCompaniesDataset } from './platforms/pitchbook';
import { PradaProductsDataset } from './platforms/prada';
import { ProperatiPropertiesDataset } from './platforms/properati';
import { QuoraPostsDataset } from './platforms/quora';
import { RaymourFlaniganProductsDataset } from './platforms/raymour_flanigan';
import { RealtorInternationalDataset } from './platforms/realtor';
import {
    RedditCommentsDataset,
    RedditPostsDataset,
} from './platforms/reddit';
import { RonaProductsDataset } from './platforms/rona';
import { SephoraProductsDataset } from './platforms/sephora';
import { SheinProductsDataset } from './platforms/shein';
import { ShopeeProductsDataset } from './platforms/shopee';
import { SleepNumberProductsDataset } from './platforms/sleep_number';
import { SlintelCompaniesDataset } from './platforms/slintel';
import { SnapchatPostsDataset } from './platforms/snapchat';
import { TargetProductsDataset } from './platforms/target';
import { ToctocPropertiesDataset } from './platforms/toctoc';
import { TokopediaProductsDataset } from './platforms/tokopedia';
import { ToysRUsProductsDataset } from './platforms/toysrus';
import { TrustpilotReviewsDataset } from './platforms/trustpilot';
import { TrustRadiusReviewsDataset } from './platforms/trustradius';
import { UsLawyersDataset } from './platforms/us_lawyers';
import { VentureRadarCompaniesDataset } from './platforms/ventureradar';
import { VimeoVideosDataset } from './platforms/vimeo';
import {
    WalmartProductsDataset,
    WalmartSellersInfoDataset,
} from './platforms/walmart';
import { WayfairProductsDataset } from './platforms/wayfair';
import { WebmotorsBrasilDataset } from './platforms/webmotors';
import { WikipediaArticlesDataset } from './platforms/wikipedia';
import { WildberriesProductsDataset } from './platforms/wildberries';
import {
    WorldPopulationDataset,
    WorldZipcodesDataset,
} from './platforms/world_data';
import { XingProfilesDataset } from './platforms/xing';
import { YahooFinanceBusinessesDataset } from './platforms/yahoo_finance';
import { YapoChileDataset } from './platforms/yapo';
import {
    YelpBusinessesDataset,
    YelpReviewsDataset,
} from './platforms/yelp';
import {
    YoutubeCommentsDataset,
    YoutubeProfilesDataset,
    YoutubeVideosDataset,
} from './platforms/youtube';
import { YslProductsDataset } from './platforms/ysl';
import { ZalandoProductsDataset } from './platforms/zalando';
import {
    ZaraProductsDataset,
    ZaraHomeProductsDataset,
} from './platforms/zara';
import {
    ZillowPriceHistoryDataset,
    ZillowPropertiesDataset,
} from './platforms/zillow';
import { ZonapropArgentinaDataset } from './platforms/zonaprop';
import { ZoomInfoCompaniesDataset } from './platforms/zoominfo';
import { ZooplaPropertiesDataset } from './platforms/zoopla';

export class DatasetsClient {
    private transport: Transport;
    private logger = getLogger('datasets');
    private cache = new Map<string, BaseDataset>();

    constructor(opts: { transport: Transport }) {
        this.transport = opts.transport;
    }

    async list(): Promise<DatasetInfo[]> {
        this.logger.debug('list');
        const response = await this.transport.request(
            API_ENDPOINT.DATASET_LIST,
        );
        const text = await assertResponse(response);
        return parseJSON<DatasetInfo[]>(text);
    }

    get linkedinProfiles(): LinkedinProfilesDataset {
        if (!this.cache.has('linkedin_profiles')) {
            this.cache.set(
                'linkedin_profiles',
                new LinkedinProfilesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('linkedin_profiles') as LinkedinProfilesDataset;
    }

    get linkedinCompanies(): LinkedinCompaniesDataset {
        if (!this.cache.has('linkedin_companies')) {
            this.cache.set(
                'linkedin_companies',
                new LinkedinCompaniesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'linkedin_companies',
        ) as LinkedinCompaniesDataset;
    }

    get amazonProducts(): AmazonProductsDataset {
        if (!this.cache.has('amazon_products')) {
            this.cache.set(
                'amazon_products',
                new AmazonProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('amazon_products') as AmazonProductsDataset;
    }

    get amazonReviews(): AmazonReviewsDataset {
        if (!this.cache.has('amazon_reviews')) {
            this.cache.set(
                'amazon_reviews',
                new AmazonReviewsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('amazon_reviews') as AmazonReviewsDataset;
    }

    get amazonSellers(): AmazonSellersDataset {
        if (!this.cache.has('amazon_sellers_info')) {
            this.cache.set(
                'amazon_sellers_info',
                new AmazonSellersDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('amazon_sellers_info') as AmazonSellersDataset;
    }

    get amazonBestSellers(): AmazonBestSellersDataset {
        if (!this.cache.has('amazon_best_sellers')) {
            this.cache.set(
                'amazon_best_sellers',
                new AmazonBestSellersDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'amazon_best_sellers',
        ) as AmazonBestSellersDataset;
    }

    get amazonProductsSearch(): AmazonProductsSearchDataset {
        if (!this.cache.has('amazon_products_search')) {
            this.cache.set(
                'amazon_products_search',
                new AmazonProductsSearchDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'amazon_products_search',
        ) as AmazonProductsSearchDataset;
    }

    get amazonProductsGlobal(): AmazonProductsGlobalDataset {
        if (!this.cache.has('amazon_products_global')) {
            this.cache.set(
                'amazon_products_global',
                new AmazonProductsGlobalDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'amazon_products_global',
        ) as AmazonProductsGlobalDataset;
    }

    get amazonWalmart(): AmazonWalmartDataset {
        if (!this.cache.has('amazon_walmart')) {
            this.cache.set(
                'amazon_walmart',
                new AmazonWalmartDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('amazon_walmart') as AmazonWalmartDataset;
    }

    // ── Instagram ────────────────────────────────────────────────────

    get instagramProfiles(): InstagramProfilesDataset {
        if (!this.cache.has('instagram_profiles')) {
            this.cache.set(
                'instagram_profiles',
                new InstagramProfilesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'instagram_profiles',
        ) as InstagramProfilesDataset;
    }

    get instagramPosts(): InstagramPostsDataset {
        if (!this.cache.has('instagram_posts')) {
            this.cache.set(
                'instagram_posts',
                new InstagramPostsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('instagram_posts') as InstagramPostsDataset;
    }

    get instagramComments(): InstagramCommentsDataset {
        if (!this.cache.has('instagram_comments')) {
            this.cache.set(
                'instagram_comments',
                new InstagramCommentsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'instagram_comments',
        ) as InstagramCommentsDataset;
    }

    get instagramReels(): InstagramReelsDataset {
        if (!this.cache.has('instagram_reels')) {
            this.cache.set(
                'instagram_reels',
                new InstagramReelsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('instagram_reels') as InstagramReelsDataset;
    }

    // ── TikTok ───────────────────────────────────────────────────────

    get tiktokProfiles(): TiktokProfilesDataset {
        if (!this.cache.has('tiktok_profiles')) {
            this.cache.set(
                'tiktok_profiles',
                new TiktokProfilesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('tiktok_profiles') as TiktokProfilesDataset;
    }

    get tiktokPosts(): TiktokPostsDataset {
        if (!this.cache.has('tiktok_posts')) {
            this.cache.set(
                'tiktok_posts',
                new TiktokPostsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('tiktok_posts') as TiktokPostsDataset;
    }

    get tiktokComments(): TiktokCommentsDataset {
        if (!this.cache.has('tiktok_comments')) {
            this.cache.set(
                'tiktok_comments',
                new TiktokCommentsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('tiktok_comments') as TiktokCommentsDataset;
    }

    get tiktokShop(): TiktokShopDataset {
        if (!this.cache.has('tiktok_shop')) {
            this.cache.set(
                'tiktok_shop',
                new TiktokShopDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('tiktok_shop') as TiktokShopDataset;
    }

    // ── X / Twitter ──────────────────────────────────────────────────

    get xTwitterPosts(): XTwitterPostsDataset {
        if (!this.cache.has('x_twitter_posts')) {
            this.cache.set(
                'x_twitter_posts',
                new XTwitterPostsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('x_twitter_posts') as XTwitterPostsDataset;
    }

    get xTwitterProfiles(): XTwitterProfilesDataset {
        if (!this.cache.has('x_twitter_profiles')) {
            this.cache.set(
                'x_twitter_profiles',
                new XTwitterProfilesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('x_twitter_profiles') as XTwitterProfilesDataset;
    }

    // ── Agoda ─────────────────────────────────────────────────────────

    get agodaProperties(): AgodaPropertiesDataset {
        if (!this.cache.has('agoda_properties')) {
            this.cache.set(
                'agoda_properties',
                new AgodaPropertiesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'agoda_properties',
        ) as AgodaPropertiesDataset;
    }

    // ── Airbnb ────────────────────────────────────────────────────────

    get airbnbProperties(): AirbnbPropertiesDataset {
        if (!this.cache.has('airbnb_properties')) {
            this.cache.set(
                'airbnb_properties',
                new AirbnbPropertiesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'airbnb_properties',
        ) as AirbnbPropertiesDataset;
    }

    // ── American Eagle ────────────────────────────────────────────────

    get americanEagleProducts(): AmericanEagleProductsDataset {
        if (!this.cache.has('american_eagle_products')) {
            this.cache.set(
                'american_eagle_products',
                new AmericanEagleProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'american_eagle_products',
        ) as AmericanEagleProductsDataset;
    }

    // ── Apple ─────────────────────────────────────────────────────────

    get appleAppStore(): AppleAppStoreDataset {
        if (!this.cache.has('apple_app_store')) {
            this.cache.set(
                'apple_app_store',
                new AppleAppStoreDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('apple_app_store') as AppleAppStoreDataset;
    }

    get appleAppStoreReviews(): AppleAppStoreReviewsDataset {
        if (!this.cache.has('apple_app_store_reviews')) {
            this.cache.set(
                'apple_app_store_reviews',
                new AppleAppStoreReviewsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'apple_app_store_reviews',
        ) as AppleAppStoreReviewsDataset;
    }

    // ── ASOS ──────────────────────────────────────────────────────────

    get asosProducts(): AsosProductsDataset {
        if (!this.cache.has('asos_products')) {
            this.cache.set(
                'asos_products',
                new AsosProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('asos_products') as AsosProductsDataset;
    }

    // ── Ashley Furniture ──────────────────────────────────────────────

    get ashleyFurnitureProducts(): AshleyFurnitureProductsDataset {
        if (!this.cache.has('ashley_furniture_products')) {
            this.cache.set(
                'ashley_furniture_products',
                new AshleyFurnitureProductsDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'ashley_furniture_products',
        ) as AshleyFurnitureProductsDataset;
    }

    // ── Australia Real Estate ─────────────────────────────────────────

    get australiaRealEstate(): AustraliaRealEstateDataset {
        if (!this.cache.has('australia_real_estate')) {
            this.cache.set(
                'australia_real_estate',
                new AustraliaRealEstateDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'australia_real_estate',
        ) as AustraliaRealEstateDataset;
    }

    // ── Autozone ──────────────────────────────────────────────────────

    get autozoneProducts(): AutozoneProductsDataset {
        if (!this.cache.has('autozone_products')) {
            this.cache.set(
                'autozone_products',
                new AutozoneProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'autozone_products',
        ) as AutozoneProductsDataset;
    }

    // ── Balenciaga ────────────────────────────────────────────────────

    get balenciagaProducts(): BalenciagaProductsDataset {
        if (!this.cache.has('balenciaga_products')) {
            this.cache.set(
                'balenciaga_products',
                new BalenciagaProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'balenciaga_products',
        ) as BalenciagaProductsDataset;
    }

    // ── BBC ───────────────────────────────────────────────────────────

    get bbcNews(): BbcNewsDataset {
        if (!this.cache.has('bbc_news')) {
            this.cache.set(
                'bbc_news',
                new BbcNewsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('bbc_news') as BbcNewsDataset;
    }

    // ── Berluti ───────────────────────────────────────────────────────

    get berlutiProducts(): BerlutiProductsDataset {
        if (!this.cache.has('berluti_products')) {
            this.cache.set(
                'berluti_products',
                new BerlutiProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'berluti_products',
        ) as BerlutiProductsDataset;
    }

    // ── Best Buy ──────────────────────────────────────────────────────

    get bestBuyProducts(): BestBuyProductsDataset {
        if (!this.cache.has('bestbuy_products')) {
            this.cache.set(
                'bestbuy_products',
                new BestBuyProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'bestbuy_products',
        ) as BestBuyProductsDataset;
    }

    // ── B&H ───────────────────────────────────────────────────────────

    get bhProducts(): BhProductsDataset {
        if (!this.cache.has('bh_products')) {
            this.cache.set(
                'bh_products',
                new BhProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('bh_products') as BhProductsDataset;
    }

    // ── Bluesky ───────────────────────────────────────────────────────

    get blueskyPosts(): BlueskyPostsDataset {
        if (!this.cache.has('bluesky_posts')) {
            this.cache.set(
                'bluesky_posts',
                new BlueskyPostsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('bluesky_posts') as BlueskyPostsDataset;
    }

    get blueskyTopProfiles(): BlueskyTopProfilesDataset {
        if (!this.cache.has('bluesky_top_profiles')) {
            this.cache.set(
                'bluesky_top_profiles',
                new BlueskyTopProfilesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'bluesky_top_profiles',
        ) as BlueskyTopProfilesDataset;
    }

    // ── Booking ───────────────────────────────────────────────────────

    get bookingHotelListings(): BookingHotelListingsDataset {
        if (!this.cache.has('booking_hotel_listings')) {
            this.cache.set(
                'booking_hotel_listings',
                new BookingHotelListingsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'booking_hotel_listings',
        ) as BookingHotelListingsDataset;
    }

    get bookingListingsSearch(): BookingListingsSearchDataset {
        if (!this.cache.has('booking_listings_search')) {
            this.cache.set(
                'booking_listings_search',
                new BookingListingsSearchDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'booking_listings_search',
        ) as BookingListingsSearchDataset;
    }

    // ── Bottega Veneta ────────────────────────────────────────────────

    get bottegaVenetaProducts(): BottegaVenetaProductsDataset {
        if (!this.cache.has('bottegaveneta_products')) {
            this.cache.set(
                'bottegaveneta_products',
                new BottegaVenetaProductsDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'bottegaveneta_products',
        ) as BottegaVenetaProductsDataset;
    }

    // ── Carsales ──────────────────────────────────────────────────────

    get carsalesListings(): CarsalesListingsDataset {
        if (!this.cache.has('carsales_listings')) {
            this.cache.set(
                'carsales_listings',
                new CarsalesListingsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'carsales_listings',
        ) as CarsalesListingsDataset;
    }

    // ── Carter's ──────────────────────────────────────────────────────

    get cartersProducts(): CartersProductsDataset {
        if (!this.cache.has('carters_products')) {
            this.cache.set(
                'carters_products',
                new CartersProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'carters_products',
        ) as CartersProductsDataset;
    }

    // ── Celine ────────────────────────────────────────────────────────

    get celineProducts(): CelineProductsDataset {
        if (!this.cache.has('celine_products')) {
            this.cache.set(
                'celine_products',
                new CelineProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('celine_products') as CelineProductsDataset;
    }

    // ── Chanel ────────────────────────────────────────────────────────

    get chanelProducts(): ChanelProductsDataset {
        if (!this.cache.has('chanel_products')) {
            this.cache.set(
                'chanel_products',
                new ChanelProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('chanel_products') as ChanelProductsDataset;
    }

    // ── Chileautos ────────────────────────────────────────────────────

    get chileautosChile(): ChileautosChileDataset {
        if (!this.cache.has('chileautos_chile')) {
            this.cache.set(
                'chileautos_chile',
                new ChileautosChileDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'chileautos_chile',
        ) as ChileautosChileDataset;
    }

    // ── CNN ───────────────────────────────────────────────────────────

    get cnnNews(): CnnNewsDataset {
        if (!this.cache.has('cnn_news')) {
            this.cache.set(
                'cnn_news',
                new CnnNewsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('cnn_news') as CnnNewsDataset;
    }

    // ── Companies Enriched ────────────────────────────────────────────

    get companiesEnriched(): CompaniesEnrichedDataset {
        if (!this.cache.has('companies_enriched')) {
            this.cache.set(
                'companies_enriched',
                new CompaniesEnrichedDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'companies_enriched',
        ) as CompaniesEnrichedDataset;
    }

    // ── Costco ────────────────────────────────────────────────────────

    get costcoProducts(): CostcoProductsDataset {
        if (!this.cache.has('costco_products')) {
            this.cache.set(
                'costco_products',
                new CostcoProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('costco_products') as CostcoProductsDataset;
    }

    // ── Crate & Barrel ────────────────────────────────────────────────

    get crateAndBarrelProducts(): CrateAndBarrelProductsDataset {
        if (!this.cache.has('crateandbarrel_products')) {
            this.cache.set(
                'crateandbarrel_products',
                new CrateAndBarrelProductsDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'crateandbarrel_products',
        ) as CrateAndBarrelProductsDataset;
    }

    // ── Creative Commons ──────────────────────────────────────────────

    get creativeCommons3dModels(): CreativeCommons3dModelsDataset {
        if (!this.cache.has('creative_commons_3d_models')) {
            this.cache.set(
                'creative_commons_3d_models',
                new CreativeCommons3dModelsDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'creative_commons_3d_models',
        ) as CreativeCommons3dModelsDataset;
    }

    get creativeCommonsImages(): CreativeCommonsImagesDataset {
        if (!this.cache.has('creative_commons_images')) {
            this.cache.set(
                'creative_commons_images',
                new CreativeCommonsImagesDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'creative_commons_images',
        ) as CreativeCommonsImagesDataset;
    }

    // ── Crunchbase ────────────────────────────────────────────────────

    get crunchbaseCompanies(): CrunchbaseCompaniesDataset {
        if (!this.cache.has('crunchbase_companies')) {
            this.cache.set(
                'crunchbase_companies',
                new CrunchbaseCompaniesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'crunchbase_companies',
        ) as CrunchbaseCompaniesDataset;
    }

    // ── Delvaux ───────────────────────────────────────────────────────

    get delvauxProducts(): DelvauxProductsDataset {
        if (!this.cache.has('delvaux_products')) {
            this.cache.set(
                'delvaux_products',
                new DelvauxProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'delvaux_products',
        ) as DelvauxProductsDataset;
    }

    // ── Digikey ───────────────────────────────────────────────────────

    get digikeyProducts(): DigikeyProductsDataset {
        if (!this.cache.has('digikey_products')) {
            this.cache.set(
                'digikey_products',
                new DigikeyProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'digikey_products',
        ) as DigikeyProductsDataset;
    }

    // ── Dior ──────────────────────────────────────────────────────────

    get diorProducts(): DiorProductsDataset {
        if (!this.cache.has('dior_products')) {
            this.cache.set(
                'dior_products',
                new DiorProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('dior_products') as DiorProductsDataset;
    }

    // ── eBay ──────────────────────────────────────────────────────────

    get ebayProducts(): EbayProductsDataset {
        if (!this.cache.has('ebay_products')) {
            this.cache.set(
                'ebay_products',
                new EbayProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('ebay_products') as EbayProductsDataset;
    }

    // ── Employees Enriched ────────────────────────────────────────────

    get employeesEnriched(): EmployeesEnrichedDataset {
        if (!this.cache.has('employees_enriched')) {
            this.cache.set(
                'employees_enriched',
                new EmployeesEnrichedDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'employees_enriched',
        ) as EmployeesEnrichedDataset;
    }

    // ── Etsy ──────────────────────────────────────────────────────────

    get etsyProducts(): EtsyProductsDataset {
        if (!this.cache.has('etsy_products')) {
            this.cache.set(
                'etsy_products',
                new EtsyProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('etsy_products') as EtsyProductsDataset;
    }

    // ── Facebook ──────────────────────────────────────────────────────

    get facebookComments(): FacebookCommentsDataset {
        if (!this.cache.has('facebook_comments')) {
            this.cache.set(
                'facebook_comments',
                new FacebookCommentsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'facebook_comments',
        ) as FacebookCommentsDataset;
    }

    get facebookCompanyReviews(): FacebookCompanyReviewsDataset {
        if (!this.cache.has('facebook_company_reviews')) {
            this.cache.set(
                'facebook_company_reviews',
                new FacebookCompanyReviewsDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'facebook_company_reviews',
        ) as FacebookCompanyReviewsDataset;
    }

    get facebookEvents(): FacebookEventsDataset {
        if (!this.cache.has('facebook_events')) {
            this.cache.set(
                'facebook_events',
                new FacebookEventsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'facebook_events',
        ) as FacebookEventsDataset;
    }

    get facebookGroupPosts(): FacebookGroupPostsDataset {
        if (!this.cache.has('facebook_group_posts')) {
            this.cache.set(
                'facebook_group_posts',
                new FacebookGroupPostsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'facebook_group_posts',
        ) as FacebookGroupPostsDataset;
    }

    get facebookMarketplace(): FacebookMarketplaceDataset {
        if (!this.cache.has('facebook_marketplace')) {
            this.cache.set(
                'facebook_marketplace',
                new FacebookMarketplaceDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'facebook_marketplace',
        ) as FacebookMarketplaceDataset;
    }

    get facebookPagesPosts(): FacebookPagesPostsDataset {
        if (!this.cache.has('facebook_pages_posts')) {
            this.cache.set(
                'facebook_pages_posts',
                new FacebookPagesPostsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'facebook_pages_posts',
        ) as FacebookPagesPostsDataset;
    }

    get facebookPagesProfiles(): FacebookPagesProfilesDataset {
        if (!this.cache.has('facebook_pages_profiles')) {
            this.cache.set(
                'facebook_pages_profiles',
                new FacebookPagesProfilesDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'facebook_pages_profiles',
        ) as FacebookPagesProfilesDataset;
    }

    get facebookPostsByUrl(): FacebookPostsByUrlDataset {
        if (!this.cache.has('facebook_posts_by_url')) {
            this.cache.set(
                'facebook_posts_by_url',
                new FacebookPostsByUrlDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'facebook_posts_by_url',
        ) as FacebookPostsByUrlDataset;
    }

    get facebookProfiles(): FacebookProfilesDataset {
        if (!this.cache.has('facebook_profiles')) {
            this.cache.set(
                'facebook_profiles',
                new FacebookProfilesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'facebook_profiles',
        ) as FacebookProfilesDataset;
    }

    get facebookReels(): FacebookReelsDataset {
        if (!this.cache.has('facebook_reels')) {
            this.cache.set(
                'facebook_reels',
                new FacebookReelsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('facebook_reels') as FacebookReelsDataset;
    }

    // ── Fanatics ──────────────────────────────────────────────────────

    get fanaticsProducts(): FanaticsProductsDataset {
        if (!this.cache.has('fanatics_products')) {
            this.cache.set(
                'fanatics_products',
                new FanaticsProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'fanatics_products',
        ) as FanaticsProductsDataset;
    }

    // ── Fendi ─────────────────────────────────────────────────────────

    get fendiProducts(): FendiProductsDataset {
        if (!this.cache.has('fendi_products')) {
            this.cache.set(
                'fendi_products',
                new FendiProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('fendi_products') as FendiProductsDataset;
    }

    // ── G2 ────────────────────────────────────────────────────────────

    get g2Products(): G2ProductsDataset {
        if (!this.cache.has('g2_products')) {
            this.cache.set(
                'g2_products',
                new G2ProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('g2_products') as G2ProductsDataset;
    }

    get g2Reviews(): G2ReviewsDataset {
        if (!this.cache.has('g2_reviews')) {
            this.cache.set(
                'g2_reviews',
                new G2ReviewsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('g2_reviews') as G2ReviewsDataset;
    }

    // ── GitHub ────────────────────────────────────────────────────────

    get githubRepositories(): GithubRepositoriesDataset {
        if (!this.cache.has('github_repositories')) {
            this.cache.set(
                'github_repositories',
                new GithubRepositoriesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'github_repositories',
        ) as GithubRepositoriesDataset;
    }

    // ── Glassdoor ─────────────────────────────────────────────────────

    get glassdoorCompanies(): GlassdoorCompaniesDataset {
        if (!this.cache.has('glassdoor_companies')) {
            this.cache.set(
                'glassdoor_companies',
                new GlassdoorCompaniesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'glassdoor_companies',
        ) as GlassdoorCompaniesDataset;
    }

    get glassdoorJobs(): GlassdoorJobsDataset {
        if (!this.cache.has('glassdoor_jobs')) {
            this.cache.set(
                'glassdoor_jobs',
                new GlassdoorJobsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('glassdoor_jobs') as GlassdoorJobsDataset;
    }

    get glassdoorReviews(): GlassdoorReviewsDataset {
        if (!this.cache.has('glassdoor_reviews')) {
            this.cache.set(
                'glassdoor_reviews',
                new GlassdoorReviewsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'glassdoor_reviews',
        ) as GlassdoorReviewsDataset;
    }

    // ── Goodreads ─────────────────────────────────────────────────────

    get goodreadsBooks(): GoodreadsBooksDataset {
        if (!this.cache.has('goodreads_books')) {
            this.cache.set(
                'goodreads_books',
                new GoodreadsBooksDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'goodreads_books',
        ) as GoodreadsBooksDataset;
    }

    // ── Google Maps ───────────────────────────────────────────────────

    get googleMapsFullInfo(): GoogleMapsFullInfoDataset {
        if (!this.cache.has('google_maps_full_info')) {
            this.cache.set(
                'google_maps_full_info',
                new GoogleMapsFullInfoDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'google_maps_full_info',
        ) as GoogleMapsFullInfoDataset;
    }

    get googleMapsReviews(): GoogleMapsReviewsDataset {
        if (!this.cache.has('google_maps_reviews')) {
            this.cache.set(
                'google_maps_reviews',
                new GoogleMapsReviewsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'google_maps_reviews',
        ) as GoogleMapsReviewsDataset;
    }

    // ── Google News ───────────────────────────────────────────────────

    get googleNews(): GoogleNewsDataset {
        if (!this.cache.has('google_news')) {
            this.cache.set(
                'google_news',
                new GoogleNewsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('google_news') as GoogleNewsDataset;
    }

    // ── Google Play ───────────────────────────────────────────────────

    get googlePlayReviews(): GooglePlayReviewsDataset {
        if (!this.cache.has('google_play_reviews')) {
            this.cache.set(
                'google_play_reviews',
                new GooglePlayReviewsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'google_play_reviews',
        ) as GooglePlayReviewsDataset;
    }

    get googlePlayStore(): GooglePlayStoreDataset {
        if (!this.cache.has('google_play_store')) {
            this.cache.set(
                'google_play_store',
                new GooglePlayStoreDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'google_play_store',
        ) as GooglePlayStoreDataset;
    }

    // ── Google Shopping ───────────────────────────────────────────────

    get googleShoppingProducts(): GoogleShoppingProductsDataset {
        if (!this.cache.has('google_shopping_products')) {
            this.cache.set(
                'google_shopping_products',
                new GoogleShoppingProductsDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'google_shopping_products',
        ) as GoogleShoppingProductsDataset;
    }

    get googleShoppingSearchUs(): GoogleShoppingSearchUsDataset {
        if (!this.cache.has('google_shopping_search_us')) {
            this.cache.set(
                'google_shopping_search_us',
                new GoogleShoppingSearchUsDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'google_shopping_search_us',
        ) as GoogleShoppingSearchUsDataset;
    }

    // ── Hermes ────────────────────────────────────────────────────────

    get hermesProducts(): HermesProductsDataset {
        if (!this.cache.has('hermes_products')) {
            this.cache.set(
                'hermes_products',
                new HermesProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('hermes_products') as HermesProductsDataset;
    }

    // ── H&M ───────────────────────────────────────────────────────────

    get hmProducts(): HmProductsDataset {
        if (!this.cache.has('hm_products')) {
            this.cache.set(
                'hm_products',
                new HmProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('hm_products') as HmProductsDataset;
    }

    // ── Home Depot ────────────────────────────────────────────────────

    get homeDepotCaProducts(): HomeDepotCaProductsDataset {
        if (!this.cache.has('homedepot_ca_products')) {
            this.cache.set(
                'homedepot_ca_products',
                new HomeDepotCaProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'homedepot_ca_products',
        ) as HomeDepotCaProductsDataset;
    }

    get homeDepotUsProducts(): HomeDepotUsProductsDataset {
        if (!this.cache.has('homedepot_us_products')) {
            this.cache.set(
                'homedepot_us_products',
                new HomeDepotUsProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'homedepot_us_products',
        ) as HomeDepotUsProductsDataset;
    }

    // ── IKEA ──────────────────────────────────────────────────────────

    get ikeaProducts(): IkeaProductsDataset {
        if (!this.cache.has('ikea_products')) {
            this.cache.set(
                'ikea_products',
                new IkeaProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('ikea_products') as IkeaProductsDataset;
    }

    // ── IMDB ──────────────────────────────────────────────────────────

    get imdbMovies(): ImdbMoviesDataset {
        if (!this.cache.has('imdb_movies')) {
            this.cache.set(
                'imdb_movies',
                new ImdbMoviesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('imdb_movies') as ImdbMoviesDataset;
    }

    // ── Indeed ────────────────────────────────────────────────────────

    get indeedCompanies(): IndeedCompaniesDataset {
        if (!this.cache.has('indeed_companies')) {
            this.cache.set(
                'indeed_companies',
                new IndeedCompaniesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'indeed_companies',
        ) as IndeedCompaniesDataset;
    }

    get indeedJobs(): IndeedJobsDataset {
        if (!this.cache.has('indeed_jobs')) {
            this.cache.set(
                'indeed_jobs',
                new IndeedJobsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('indeed_jobs') as IndeedJobsDataset;
    }

    // ── Infocasas ─────────────────────────────────────────────────────

    get infocasasUruguay(): InfocasasUruguayDataset {
        if (!this.cache.has('infocasas_uruguay')) {
            this.cache.set(
                'infocasas_uruguay',
                new InfocasasUruguayDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'infocasas_uruguay',
        ) as InfocasasUruguayDataset;
    }

    // ── Inmuebles24 ───────────────────────────────────────────────────

    get inmuebles24Mexico(): Inmuebles24MexicoDataset {
        if (!this.cache.has('inmuebles24_mexico')) {
            this.cache.set(
                'inmuebles24_mexico',
                new Inmuebles24MexicoDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'inmuebles24_mexico',
        ) as Inmuebles24MexicoDataset;
    }

    // ── Kroger ────────────────────────────────────────────────────────

    get krogerProducts(): KrogerProductsDataset {
        if (!this.cache.has('kroger_products')) {
            this.cache.set(
                'kroger_products',
                new KrogerProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('kroger_products') as KrogerProductsDataset;
    }

    // ── Lazada ────────────────────────────────────────────────────────

    get lazadaProducts(): LazadaProductsDataset {
        if (!this.cache.has('lazada_products')) {
            this.cache.set(
                'lazada_products',
                new LazadaProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'lazada_products',
        ) as LazadaProductsDataset;
    }

    get lazadaProductsSearch(): LazadaProductsSearchDataset {
        if (!this.cache.has('lazada_products_search')) {
            this.cache.set(
                'lazada_products_search',
                new LazadaProductsSearchDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'lazada_products_search',
        ) as LazadaProductsSearchDataset;
    }

    get lazadaReviews(): LazadaReviewsDataset {
        if (!this.cache.has('lazada_reviews')) {
            this.cache.set(
                'lazada_reviews',
                new LazadaReviewsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('lazada_reviews') as LazadaReviewsDataset;
    }

    // ── La-Z-Boy ──────────────────────────────────────────────────────

    get laZBoyProducts(): LaZBoyProductsDataset {
        if (!this.cache.has('lazboy_products')) {
            this.cache.set(
                'lazboy_products',
                new LaZBoyProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'lazboy_products',
        ) as LaZBoyProductsDataset;
    }

    // ── Lego ────────────────────────────────────────────────────────────

    get legoProducts(): LegoProductsDataset {
        if (!this.cache.has('lego_products')) {
            this.cache.set(
                'lego_products',
                new LegoProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('lego_products') as LegoProductsDataset;
    }

    // ── LinkedIn (continued) ──────────────────────────────────────────

    get linkedinJobListings(): LinkedinJobListingsDataset {
        if (!this.cache.has('linkedin_job_listings')) {
            this.cache.set(
                'linkedin_job_listings',
                new LinkedinJobListingsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'linkedin_job_listings',
        ) as LinkedinJobListingsDataset;
    }

    get linkedinPosts(): LinkedinPostsDataset {
        if (!this.cache.has('linkedin_posts')) {
            this.cache.set(
                'linkedin_posts',
                new LinkedinPostsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('linkedin_posts') as LinkedinPostsDataset;
    }

    get linkedinProfilesJobListings(): LinkedinProfilesJobListingsDataset {
        if (!this.cache.has('linkedin_profiles_job_listings')) {
            this.cache.set(
                'linkedin_profiles_job_listings',
                new LinkedinProfilesJobListingsDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'linkedin_profiles_job_listings',
        ) as LinkedinProfilesJobListingsDataset;
    }

    // ── L.L.Bean ──────────────────────────────────────────────────────

    get llBeanProducts(): LlBeanProductsDataset {
        if (!this.cache.has('llbean_products')) {
            this.cache.set(
                'llbean_products',
                new LlBeanProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'llbean_products',
        ) as LlBeanProductsDataset;
    }

    // ── Loewe ─────────────────────────────────────────────────────────

    get loeweProducts(): LoeweProductsDataset {
        if (!this.cache.has('loewe_products')) {
            this.cache.set(
                'loewe_products',
                new LoeweProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('loewe_products') as LoeweProductsDataset;
    }

    // ── Lowe's ────────────────────────────────────────────────────────

    get lowesProducts(): LowesProductsDataset {
        if (!this.cache.has('lowes_products')) {
            this.cache.set(
                'lowes_products',
                new LowesProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('lowes_products') as LowesProductsDataset;
    }

    // ── Macy's ────────────────────────────────────────────────────────

    get macysProducts(): MacysProductsDataset {
        if (!this.cache.has('macys_products')) {
            this.cache.set(
                'macys_products',
                new MacysProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('macys_products') as MacysProductsDataset;
    }

    // ── Mango ─────────────────────────────────────────────────────────

    get mangoProducts(): MangoProductsDataset {
        if (!this.cache.has('mango_products')) {
            this.cache.set(
                'mango_products',
                new MangoProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('mango_products') as MangoProductsDataset;
    }

    // ── Manta ─────────────────────────────────────────────────────────

    get mantaBusinesses(): MantaBusinessesDataset {
        if (!this.cache.has('manta_businesses')) {
            this.cache.set(
                'manta_businesses',
                new MantaBusinessesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'manta_businesses',
        ) as MantaBusinessesDataset;
    }

    // ── Massimo Dutti ─────────────────────────────────────────────────

    get massimoDuttiProducts(): MassimoDuttiProductsDataset {
        if (!this.cache.has('massimo_dutti_products')) {
            this.cache.set(
                'massimo_dutti_products',
                new MassimoDuttiProductsDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'massimo_dutti_products',
        ) as MassimoDuttiProductsDataset;
    }

    // ── Mattress Firm ─────────────────────────────────────────────────

    get mattressFirmProducts(): MattressFirmProductsDataset {
        if (!this.cache.has('mattressfirm_products')) {
            this.cache.set(
                'mattressfirm_products',
                new MattressFirmProductsDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'mattressfirm_products',
        ) as MattressFirmProductsDataset;
    }

    // ── MediaMarkt ────────────────────────────────────────────────────

    get mediamarktProducts(): MediamarktProductsDataset {
        if (!this.cache.has('mediamarkt_products')) {
            this.cache.set(
                'mediamarkt_products',
                new MediamarktProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'mediamarkt_products',
        ) as MediamarktProductsDataset;
    }

    // ── Mercado Livre ─────────────────────────────────────────────────

    get mercadolivreProducts(): MercadolivreProductsDataset {
        if (!this.cache.has('mercadolivre_products')) {
            this.cache.set(
                'mercadolivre_products',
                new MercadolivreProductsDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'mercadolivre_products',
        ) as MercadolivreProductsDataset;
    }

    // ── Metrocuadrado ──────────────────────────────────────────────────

    get metrocuadradoProperties(): MetrocuadradoPropertiesDataset {
        if (!this.cache.has('metrocuadrado_properties')) {
            this.cache.set(
                'metrocuadrado_properties',
                new MetrocuadradoPropertiesDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'metrocuadrado_properties',
        ) as MetrocuadradoPropertiesDataset;
    }

    // ── Micro Center ──────────────────────────────────────────────────

    get microCenterProducts(): MicroCenterProductsDataset {
        if (!this.cache.has('microcenter_products')) {
            this.cache.set(
                'microcenter_products',
                new MicroCenterProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'microcenter_products',
        ) as MicroCenterProductsDataset;
    }

    // ── Montblanc ─────────────────────────────────────────────────────

    get montblancProducts(): MontblancProductsDataset {
        if (!this.cache.has('montblanc_products')) {
            this.cache.set(
                'montblanc_products',
                new MontblancProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'montblanc_products',
        ) as MontblancProductsDataset;
    }

    // ── Mouser ────────────────────────────────────────────────────────

    get mouserProducts(): MouserProductsDataset {
        if (!this.cache.has('mouser_products')) {
            this.cache.set(
                'mouser_products',
                new MouserProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('mouser_products') as MouserProductsDataset;
    }

    // ── Moynat ────────────────────────────────────────────────────────

    get moynatProducts(): MoynatProductsDataset {
        if (!this.cache.has('moynat_products')) {
            this.cache.set(
                'moynat_products',
                new MoynatProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('moynat_products') as MoynatProductsDataset;
    }

    // ── MyBobs ────────────────────────────────────────────────────────

    get mybobsProducts(): MybobsProductsDataset {
        if (!this.cache.has('mybobs_products')) {
            this.cache.set(
                'mybobs_products',
                new MybobsProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'mybobs_products',
        ) as MybobsProductsDataset;
    }

    // ── Myntra ────────────────────────────────────────────────────────

    get myntraProducts(): MyntraProductsDataset {
        if (!this.cache.has('myntra_products')) {
            this.cache.set(
                'myntra_products',
                new MyntraProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('myntra_products') as MyntraProductsDataset;
    }

    // ── Naver ─────────────────────────────────────────────────────────

    get naverProducts(): NaverProductsDataset {
        if (!this.cache.has('naver_products')) {
            this.cache.set(
                'naver_products',
                new NaverProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('naver_products') as NaverProductsDataset;
    }

    // ── NBA ───────────────────────────────────────────────────────────

    get nbaPlayersStats(): NbaPlayersStatsDataset {
        if (!this.cache.has('nba_players_stats')) {
            this.cache.set(
                'nba_players_stats',
                new NbaPlayersStatsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'nba_players_stats',
        ) as NbaPlayersStatsDataset;
    }

    // ── OLX ───────────────────────────────────────────────────────────

    get olxBrazil(): OlxBrazilDataset {
        if (!this.cache.has('olx_brazil')) {
            this.cache.set(
                'olx_brazil',
                new OlxBrazilDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('olx_brazil') as OlxBrazilDataset;
    }

    // ── Otodom ────────────────────────────────────────────────────────

    get otodomPoland(): OtodomPolandDataset {
        if (!this.cache.has('otodom_poland')) {
            this.cache.set(
                'otodom_poland',
                new OtodomPolandDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('otodom_poland') as OtodomPolandDataset;
    }

    // ── Owler ─────────────────────────────────────────────────────────

    get owlerCompanies(): OwlerCompaniesDataset {
        if (!this.cache.has('owler_companies')) {
            this.cache.set(
                'owler_companies',
                new OwlerCompaniesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'owler_companies',
        ) as OwlerCompaniesDataset;
    }

    // ── Ozon ──────────────────────────────────────────────────────────

    get ozonProducts(): OzonProductsDataset {
        if (!this.cache.has('ozon_products')) {
            this.cache.set(
                'ozon_products',
                new OzonProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('ozon_products') as OzonProductsDataset;
    }

    // ── Pinterest ─────────────────────────────────────────────────────

    get pinterestPosts(): PinterestPostsDataset {
        if (!this.cache.has('pinterest_posts')) {
            this.cache.set(
                'pinterest_posts',
                new PinterestPostsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'pinterest_posts',
        ) as PinterestPostsDataset;
    }

    get pinterestProfiles(): PinterestProfilesDataset {
        if (!this.cache.has('pinterest_profiles')) {
            this.cache.set(
                'pinterest_profiles',
                new PinterestProfilesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'pinterest_profiles',
        ) as PinterestProfilesDataset;
    }

    // ── PitchBook ─────────────────────────────────────────────────────

    get pitchBookCompanies(): PitchBookCompaniesDataset {
        if (!this.cache.has('pitchbook_companies')) {
            this.cache.set(
                'pitchbook_companies',
                new PitchBookCompaniesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'pitchbook_companies',
        ) as PitchBookCompaniesDataset;
    }

    // ── Prada ─────────────────────────────────────────────────────────

    get pradaProducts(): PradaProductsDataset {
        if (!this.cache.has('prada_products')) {
            this.cache.set(
                'prada_products',
                new PradaProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('prada_products') as PradaProductsDataset;
    }

    // ── Properati ─────────────────────────────────────────────────────

    get properatiProperties(): ProperatiPropertiesDataset {
        if (!this.cache.has('properati_properties')) {
            this.cache.set(
                'properati_properties',
                new ProperatiPropertiesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'properati_properties',
        ) as ProperatiPropertiesDataset;
    }

    // ── Quora ─────────────────────────────────────────────────────────

    get quoraPosts(): QuoraPostsDataset {
        if (!this.cache.has('quora_posts')) {
            this.cache.set(
                'quora_posts',
                new QuoraPostsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('quora_posts') as QuoraPostsDataset;
    }

    // ── Raymour & Flanigan ────────────────────────────────────────────

    get raymourFlaniganProducts(): RaymourFlaniganProductsDataset {
        if (!this.cache.has('raymourflanigan_products')) {
            this.cache.set(
                'raymourflanigan_products',
                new RaymourFlaniganProductsDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'raymourflanigan_products',
        ) as RaymourFlaniganProductsDataset;
    }

    // ── Realtor ───────────────────────────────────────────────────────

    get realtorInternational(): RealtorInternationalDataset {
        if (!this.cache.has('realtor_international_properties')) {
            this.cache.set(
                'realtor_international_properties',
                new RealtorInternationalDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'realtor_international_properties',
        ) as RealtorInternationalDataset;
    }

    // ── Reddit ────────────────────────────────────────────────────────

    get redditComments(): RedditCommentsDataset {
        if (!this.cache.has('reddit_comments')) {
            this.cache.set(
                'reddit_comments',
                new RedditCommentsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'reddit_comments',
        ) as RedditCommentsDataset;
    }

    get redditPosts(): RedditPostsDataset {
        if (!this.cache.has('reddit_posts')) {
            this.cache.set(
                'reddit_posts',
                new RedditPostsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('reddit_posts') as RedditPostsDataset;
    }

    // ── Rona ──────────────────────────────────────────────────────────

    get ronaProducts(): RonaProductsDataset {
        if (!this.cache.has('rona_products')) {
            this.cache.set(
                'rona_products',
                new RonaProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('rona_products') as RonaProductsDataset;
    }

    // ── Sephora ───────────────────────────────────────────────────────

    get sephoraProducts(): SephoraProductsDataset {
        if (!this.cache.has('sephora_products')) {
            this.cache.set(
                'sephora_products',
                new SephoraProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'sephora_products',
        ) as SephoraProductsDataset;
    }

    // ── SHEIN ─────────────────────────────────────────────────────────

    get sheinProducts(): SheinProductsDataset {
        if (!this.cache.has('shein_products')) {
            this.cache.set(
                'shein_products',
                new SheinProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('shein_products') as SheinProductsDataset;
    }

    // ── Shopee ────────────────────────────────────────────────────────

    get shopeeProducts(): ShopeeProductsDataset {
        if (!this.cache.has('shopee_products')) {
            this.cache.set(
                'shopee_products',
                new ShopeeProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('shopee_products') as ShopeeProductsDataset;
    }

    // ── Sleep Number ──────────────────────────────────────────────────

    get sleepNumberProducts(): SleepNumberProductsDataset {
        if (!this.cache.has('sleepnumber_products')) {
            this.cache.set(
                'sleepnumber_products',
                new SleepNumberProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'sleepnumber_products',
        ) as SleepNumberProductsDataset;
    }

    // ── Slintel ───────────────────────────────────────────────────────

    get slintelCompanies(): SlintelCompaniesDataset {
        if (!this.cache.has('slintel_companies')) {
            this.cache.set(
                'slintel_companies',
                new SlintelCompaniesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'slintel_companies',
        ) as SlintelCompaniesDataset;
    }

    // ── Snapchat ──────────────────────────────────────────────────────

    get snapchatPosts(): SnapchatPostsDataset {
        if (!this.cache.has('snapchat_posts')) {
            this.cache.set(
                'snapchat_posts',
                new SnapchatPostsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('snapchat_posts') as SnapchatPostsDataset;
    }

    // ── Target ──────────────────────────────────────────────────────────

    get targetProducts(): TargetProductsDataset {
        if (!this.cache.has('target_products')) {
            this.cache.set(
                'target_products',
                new TargetProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'target_products',
        ) as TargetProductsDataset;
    }

    // ── TocToc ────────────────────────────────────────────────────────

    get toctocProperties(): ToctocPropertiesDataset {
        if (!this.cache.has('toctoc_properties')) {
            this.cache.set(
                'toctoc_properties',
                new ToctocPropertiesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'toctoc_properties',
        ) as ToctocPropertiesDataset;
    }

    // ── Tokopedia ─────────────────────────────────────────────────────

    get tokopediaProducts(): TokopediaProductsDataset {
        if (!this.cache.has('tokopedia_products')) {
            this.cache.set(
                'tokopedia_products',
                new TokopediaProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'tokopedia_products',
        ) as TokopediaProductsDataset;
    }

    // ── Toys"R"Us ─────────────────────────────────────────────────────

    get toysRUsProducts(): ToysRUsProductsDataset {
        if (!this.cache.has('toysrus_products')) {
            this.cache.set(
                'toysrus_products',
                new ToysRUsProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'toysrus_products',
        ) as ToysRUsProductsDataset;
    }

    // ── Trustpilot ────────────────────────────────────────────────────

    get trustpilotReviews(): TrustpilotReviewsDataset {
        if (!this.cache.has('trustpilot_reviews')) {
            this.cache.set(
                'trustpilot_reviews',
                new TrustpilotReviewsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'trustpilot_reviews',
        ) as TrustpilotReviewsDataset;
    }

    // ── TrustRadius ───────────────────────────────────────────────────

    get trustRadiusReviews(): TrustRadiusReviewsDataset {
        if (!this.cache.has('trustradius_reviews')) {
            this.cache.set(
                'trustradius_reviews',
                new TrustRadiusReviewsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'trustradius_reviews',
        ) as TrustRadiusReviewsDataset;
    }

    // ── US Lawyers ────────────────────────────────────────────────────

    get usLawyers(): UsLawyersDataset {
        if (!this.cache.has('us_lawyers')) {
            this.cache.set(
                'us_lawyers',
                new UsLawyersDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('us_lawyers') as UsLawyersDataset;
    }

    // ── VentureRadar ──────────────────────────────────────────────────

    get ventureRadarCompanies(): VentureRadarCompaniesDataset {
        if (!this.cache.has('ventureradar_companies')) {
            this.cache.set(
                'ventureradar_companies',
                new VentureRadarCompaniesDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'ventureradar_companies',
        ) as VentureRadarCompaniesDataset;
    }

    // ── Vimeo ─────────────────────────────────────────────────────────

    get vimeoVideos(): VimeoVideosDataset {
        if (!this.cache.has('vimeo_videos')) {
            this.cache.set(
                'vimeo_videos',
                new VimeoVideosDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('vimeo_videos') as VimeoVideosDataset;
    }

    // ── Walmart ───────────────────────────────────────────────────────

    get walmartProducts(): WalmartProductsDataset {
        if (!this.cache.has('walmart_products')) {
            this.cache.set(
                'walmart_products',
                new WalmartProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'walmart_products',
        ) as WalmartProductsDataset;
    }

    get walmartSellersInfo(): WalmartSellersInfoDataset {
        if (!this.cache.has('walmart_sellers_info')) {
            this.cache.set(
                'walmart_sellers_info',
                new WalmartSellersInfoDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'walmart_sellers_info',
        ) as WalmartSellersInfoDataset;
    }

    // ── Wayfair ───────────────────────────────────────────────────────

    get wayfairProducts(): WayfairProductsDataset {
        if (!this.cache.has('wayfair_products')) {
            this.cache.set(
                'wayfair_products',
                new WayfairProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'wayfair_products',
        ) as WayfairProductsDataset;
    }

    // ── Webmotors ─────────────────────────────────────────────────────

    get webmotorsBrasil(): WebmotorsBrasilDataset {
        if (!this.cache.has('webmotors_brasil')) {
            this.cache.set(
                'webmotors_brasil',
                new WebmotorsBrasilDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'webmotors_brasil',
        ) as WebmotorsBrasilDataset;
    }

    // ── Wikipedia ─────────────────────────────────────────────────────

    get wikipediaArticles(): WikipediaArticlesDataset {
        if (!this.cache.has('wikipedia_articles')) {
            this.cache.set(
                'wikipedia_articles',
                new WikipediaArticlesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'wikipedia_articles',
        ) as WikipediaArticlesDataset;
    }

    // ── Wildberries ───────────────────────────────────────────────────

    get wildberriesProducts(): WildberriesProductsDataset {
        if (!this.cache.has('wildberries_products')) {
            this.cache.set(
                'wildberries_products',
                new WildberriesProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'wildberries_products',
        ) as WildberriesProductsDataset;
    }

    // ── World Data ────────────────────────────────────────────────────

    get worldPopulation(): WorldPopulationDataset {
        if (!this.cache.has('world_population')) {
            this.cache.set(
                'world_population',
                new WorldPopulationDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'world_population',
        ) as WorldPopulationDataset;
    }

    get worldZipcodes(): WorldZipcodesDataset {
        if (!this.cache.has('world_zipcodes')) {
            this.cache.set(
                'world_zipcodes',
                new WorldZipcodesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('world_zipcodes') as WorldZipcodesDataset;
    }

    // ── Xing ────────────────────────────────────────────────────────────

    get xingProfiles(): XingProfilesDataset {
        if (!this.cache.has('xing_profiles')) {
            this.cache.set(
                'xing_profiles',
                new XingProfilesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('xing_profiles') as XingProfilesDataset;
    }

    // ── Yahoo Finance ─────────────────────────────────────────────────

    get yahooFinanceBusinesses(): YahooFinanceBusinessesDataset {
        if (!this.cache.has('yahoo_finance_businesses')) {
            this.cache.set(
                'yahoo_finance_businesses',
                new YahooFinanceBusinessesDataset({
                    transport: this.transport,
                }),
            );
        }
        return this.cache.get(
            'yahoo_finance_businesses',
        ) as YahooFinanceBusinessesDataset;
    }

    // ── Yapo ──────────────────────────────────────────────────────────

    get yapoChile(): YapoChileDataset {
        if (!this.cache.has('yapo_chile')) {
            this.cache.set(
                'yapo_chile',
                new YapoChileDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('yapo_chile') as YapoChileDataset;
    }

    // ── Yelp ──────────────────────────────────────────────────────────

    get yelpBusinesses(): YelpBusinessesDataset {
        if (!this.cache.has('yelp_businesses')) {
            this.cache.set(
                'yelp_businesses',
                new YelpBusinessesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'yelp_businesses',
        ) as YelpBusinessesDataset;
    }

    get yelpReviews(): YelpReviewsDataset {
        if (!this.cache.has('yelp_reviews')) {
            this.cache.set(
                'yelp_reviews',
                new YelpReviewsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('yelp_reviews') as YelpReviewsDataset;
    }

    // ── YouTube ────────────────────────────────────────────────────────

    get youtubeComments(): YoutubeCommentsDataset {
        if (!this.cache.has('youtube_comments')) {
            this.cache.set(
                'youtube_comments',
                new YoutubeCommentsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'youtube_comments',
        ) as YoutubeCommentsDataset;
    }

    get youtubeProfiles(): YoutubeProfilesDataset {
        if (!this.cache.has('youtube_profiles')) {
            this.cache.set(
                'youtube_profiles',
                new YoutubeProfilesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'youtube_profiles',
        ) as YoutubeProfilesDataset;
    }

    get youtubeVideos(): YoutubeVideosDataset {
        if (!this.cache.has('youtube_videos')) {
            this.cache.set(
                'youtube_videos',
                new YoutubeVideosDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('youtube_videos') as YoutubeVideosDataset;
    }

    // ── YSL ────────────────────────────────────────────────────────────

    get yslProducts(): YslProductsDataset {
        if (!this.cache.has('ysl_products')) {
            this.cache.set(
                'ysl_products',
                new YslProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('ysl_products') as YslProductsDataset;
    }

    // ── Zalando ────────────────────────────────────────────────────────

    get zalandoProducts(): ZalandoProductsDataset {
        if (!this.cache.has('zalando_products')) {
            this.cache.set(
                'zalando_products',
                new ZalandoProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'zalando_products',
        ) as ZalandoProductsDataset;
    }

    // ── Zara ───────────────────────────────────────────────────────────

    get zaraHomeProducts(): ZaraHomeProductsDataset {
        if (!this.cache.has('zara_home_products')) {
            this.cache.set(
                'zara_home_products',
                new ZaraHomeProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'zara_home_products',
        ) as ZaraHomeProductsDataset;
    }

    get zaraProducts(): ZaraProductsDataset {
        if (!this.cache.has('zara_products')) {
            this.cache.set(
                'zara_products',
                new ZaraProductsDataset({ transport: this.transport }),
            );
        }
        return this.cache.get('zara_products') as ZaraProductsDataset;
    }

    // ── Zillow ─────────────────────────────────────────────────────────

    get zillowPriceHistory(): ZillowPriceHistoryDataset {
        if (!this.cache.has('zillow_price_history')) {
            this.cache.set(
                'zillow_price_history',
                new ZillowPriceHistoryDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'zillow_price_history',
        ) as ZillowPriceHistoryDataset;
    }

    get zillowProperties(): ZillowPropertiesDataset {
        if (!this.cache.has('zillow_properties')) {
            this.cache.set(
                'zillow_properties',
                new ZillowPropertiesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'zillow_properties',
        ) as ZillowPropertiesDataset;
    }

    // ── Zonaprop ───────────────────────────────────────────────────────

    get zonapropArgentina(): ZonapropArgentinaDataset {
        if (!this.cache.has('zonaprop_argentina')) {
            this.cache.set(
                'zonaprop_argentina',
                new ZonapropArgentinaDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'zonaprop_argentina',
        ) as ZonapropArgentinaDataset;
    }

    // ── ZoomInfo ───────────────────────────────────────────────────────

    get zoomInfoCompanies(): ZoomInfoCompaniesDataset {
        if (!this.cache.has('zoominfo_companies')) {
            this.cache.set(
                'zoominfo_companies',
                new ZoomInfoCompaniesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'zoominfo_companies',
        ) as ZoomInfoCompaniesDataset;
    }

    // ── Zoopla ─────────────────────────────────────────────────────────

    get zooplaProperties(): ZooplaPropertiesDataset {
        if (!this.cache.has('zoopla_properties')) {
            this.cache.set(
                'zoopla_properties',
                new ZooplaPropertiesDataset({ transport: this.transport }),
            );
        }
        return this.cache.get(
            'zoopla_properties',
        ) as ZooplaPropertiesDataset;
    }
}
