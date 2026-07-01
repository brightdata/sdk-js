import { LinkedinAPI } from './linkedin.js';
import { SnapshotAPI } from './snapshot.js';
import { ChatgptAPI } from './chatgpt.js';
import { AmazonAPI } from './amazon.js';
import { BaseAPIOptions } from './base.js';
import { InstagramAPI } from './instagram.js';
import { FacebookAPI } from './facebook.js';
import { PerplexityAPI } from './perplexity.js';
import { TiktokAPI } from './tiktok.js';
import { YoutubeAPI } from './youtube.js';
import { DigikeyAPI } from './digikey.js';
import { PinterestAPI } from './pinterest.js';
import { RedditAPI } from './reddit.js';

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
