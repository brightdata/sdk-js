import { LinkedinAPI } from './linkedin';
import { SnapshotAPI } from './snapshot';
import { ChatgptAPI } from './chatgpt';
import { AmazonAPI } from './amazon';
import { BaseAPIOptions } from './base';
import { InstagramAPI } from './instagram';
import { FacebookAPI } from './facebook';
import { PerplexityAPI } from './perplexity';
import { TiktokAPI } from './tiktok';
import { YoutubeAPI } from './youtube';
import { DigikeyAPI } from './digikey';
import { PinterestAPI } from './pinterest';
import { RedditAPI } from './reddit';

export class ScrapeRouter {
    snapshot: SnapshotAPI;
    linkedin: LinkedinAPI;
    chatGPT: ChatgptAPI;
    amazon: AmazonAPI;
    instagram: InstagramAPI;
    facebook: FacebookAPI;
    perplexity: PerplexityAPI;
    tiktok: TiktokAPI;
    youtube: YoutubeAPI;
    digikey: DigikeyAPI;
    pinterest: PinterestAPI;
    reddit: RedditAPI;

    constructor(opts: BaseAPIOptions) {
        this.snapshot = new SnapshotAPI(opts);

        const platformOpts = { ...opts, snapshotOps: this.snapshot };
        this.linkedin = new LinkedinAPI(platformOpts);
        this.chatGPT = new ChatgptAPI(platformOpts);
        this.amazon = new AmazonAPI(platformOpts);
        this.instagram = new InstagramAPI(platformOpts);
        this.facebook = new FacebookAPI(platformOpts);
        this.perplexity = new PerplexityAPI(platformOpts);
        this.tiktok = new TiktokAPI(platformOpts);
        this.youtube = new YoutubeAPI(platformOpts);
        this.digikey = new DigikeyAPI(platformOpts);
        this.pinterest = new PinterestAPI(platformOpts);
        this.reddit = new RedditAPI(platformOpts);
    }
}
