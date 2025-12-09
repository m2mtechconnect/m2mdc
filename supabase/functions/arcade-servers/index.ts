import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ARCADE_API_BASE = Deno.env.get('ARCADE_API_BASE') || 'https://api.arcade.dev';
const ARCADE_API_KEY = Deno.env.get('ARCADE_API_KEY');

// Arcade is OPTIONAL - app works without it
if (!ARCADE_API_KEY) {
  console.warn('[arcade-servers] ARCADE_API_KEY not configured - using mock data only');
}

// Fallback mock data if Arcade API is unavailable
const MOCK_SERVERS = [
  {
    id: "gmail",
    name: "Gmail",
    designation: "Arcade Optimized",
    category: "Productivity & Docs",
    tags: ["Auth Provider", "Featured"],
    description: "Send, read, and manage Gmail messages and threads with full OAuth support",
    logo: "https://www.google.com/gmail/about/static/images/logo-gmail.png",
    capabilities: { tools: 8, resources: 3, prompts: 2 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/gmail",
    featured: true
  },
  {
    id: "slack",
    name: "Slack",
    designation: "Arcade Optimized",
    category: "Social & Communication",
    tags: ["Auth Provider", "Featured"],
    description: "Send messages, manage channels, and interact with Slack workspaces seamlessly",
    logo: "https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png",
    capabilities: { tools: 12, resources: 5, prompts: 4 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/slack",
    featured: true
  },
  {
    id: "github",
    name: "GitHub",
    designation: "Verified",
    category: "Developer Tools",
    tags: ["Auth Provider", "Featured"],
    description: "Manage repositories, issues, pull requests, and GitHub workflows programmatically",
    logo: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
    capabilities: { tools: 15, resources: 8, prompts: 3 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/github",
    featured: true
  },
  {
    id: "google-drive",
    name: "Google Drive",
    designation: "Arcade Starter",
    category: "Productivity & Docs",
    tags: ["Auth Provider", "Featured"],
    description: "Access, search, and manage files in Google Drive with comprehensive API access",
    logo: "https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png",
    capabilities: { tools: 10, resources: 6, prompts: 2 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/drive",
    featured: true
  },
  {
    id: "confluence",
    name: "Confluence",
    designation: "Community",
    category: "Productivity & Docs",
    tags: ["BYOC"],
    description: "Search and manage Confluence spaces, pages, and content across your organization",
    logo: "https://wac-cdn.atlassian.com/assets/img/favicons/confluence/favicon.png",
    capabilities: { tools: 7, resources: 4, prompts: 2 },
    auth_method: "API Token",
    endpoint: "https://arcade.dev/mcp/confluence",
    featured: false
  },
  {
    id: "hubspot",
    name: "HubSpot",
    designation: "Verified",
    category: "Sales",
    tags: ["Auth Provider", "Pro", "Featured"],
    description: "Manage contacts, deals, and CRM data in HubSpot with advanced automation",
    logo: "https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png",
    capabilities: { tools: 14, resources: 7, prompts: 5 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/hubspot",
    featured: true
  },
  {
    id: "notion",
    name: "Notion",
    designation: "Arcade Optimized",
    category: "Productivity & Docs",
    tags: ["Auth Provider", "Featured"],
    description: "Create, update, and query Notion databases and pages with full workspace access",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png",
    capabilities: { tools: 11, resources: 5, prompts: 3 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/notion",
    featured: true
  },
  {
    id: "salesforce",
    name: "Salesforce",
    designation: "Verified",
    category: "Sales",
    tags: ["Auth Provider", "Pro", "Featured"],
    description: "Complete Salesforce CRM integration with custom objects and workflow automation",
    logo: "https://c1.sfdcstatic.com/content/dam/sfdc-docs/www/logos/logo-salesforce.svg",
    capabilities: { tools: 18, resources: 10, prompts: 6 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/salesforce",
    featured: true
  },
  {
    id: "stripe",
    name: "Stripe",
    designation: "Verified",
    category: "Payments & Finance",
    tags: ["Auth Provider", "Pro"],
    description: "Process payments, manage subscriptions, and handle customer billing",
    logo: "https://images.ctfassets.net/fzn2n1nzq965/HTTOloNPhisV9P4hlMPNA/cacf1bb88b9fc492dfad34378d844280/Stripe_icon_-_square.svg",
    capabilities: { tools: 16, resources: 8, prompts: 4 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/stripe",
    featured: false
  },
  {
    id: "airtable",
    name: "Airtable",
    designation: "Community",
    category: "Databases",
    tags: ["BYOC"],
    description: "Read and write records across Airtable bases with custom field support",
    logo: "https://static.airtable.com/images/favicon/baymax/favicon-32x32.png",
    capabilities: { tools: 9, resources: 4, prompts: 2 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/airtable",
    featured: false
  },
  {
    id: "zendesk",
    name: "Zendesk",
    designation: "Verified",
    category: "Customer Support",
    tags: ["Auth Provider"],
    description: "Manage support tickets, customer interactions, and help center content",
    logo: "https://d1eipm3vz40hy0.cloudfront.net/images/nav/Zendesk_wordmark_dark.svg",
    capabilities: { tools: 13, resources: 6, prompts: 4 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/zendesk",
    featured: false
  },
  {
    id: "asana",
    name: "Asana",
    designation: "Arcade Starter",
    category: "Productivity & Docs",
    tags: ["Auth Provider"],
    description: "Create and manage tasks, projects, and team workflows in Asana",
    logo: "https://luna1.co/asana.png",
    capabilities: { tools: 10, resources: 5, prompts: 3 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/asana",
    featured: false
  },
  {
    id: "jira",
    name: "Jira",
    designation: "Verified",
    category: "Productivity & Docs",
    tags: ["Auth Provider", "Featured"],
    description: "Track issues, manage sprints, and coordinate software development workflows",
    logo: "https://wac-cdn.atlassian.com/assets/img/favicons/atlassian/favicon.png",
    capabilities: { tools: 16, resources: 8, prompts: 5 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/jira",
    featured: true
  },
  {
    id: "trello",
    name: "Trello",
    designation: "Arcade Starter",
    category: "Productivity & Docs",
    tags: ["Auth Provider"],
    description: "Organize projects with boards, lists, and cards for team collaboration",
    logo: "https://a.trellocdn.com/prgb/dist/images/ios/apple-touch-icon-152x152-precomposed.png",
    capabilities: { tools: 11, resources: 6, prompts: 3 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/trello",
    featured: false
  },
  {
    id: "monday",
    name: "Monday.com",
    designation: "Verified",
    category: "Productivity & Docs",
    tags: ["Auth Provider"],
    description: "Manage workflows, projects, and team collaboration in one workspace",
    logo: "https://dapulse-res.cloudinary.com/image/upload/monday_platform/favicon/apple-touch-icon.png",
    capabilities: { tools: 13, resources: 7, prompts: 4 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/monday",
    featured: false
  },
  {
    id: "clickup",
    name: "ClickUp",
    designation: "Community",
    category: "Productivity & Docs",
    tags: ["BYOC"],
    description: "All-in-one project management with tasks, docs, goals, and time tracking",
    logo: "https://clickup.com/landing/images/favicon.png",
    capabilities: { tools: 14, resources: 7, prompts: 4 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/clickup",
    featured: false
  },
  {
    id: "microsoft-teams",
    name: "Microsoft Teams",
    designation: "Arcade Optimized",
    category: "Social & Communication",
    tags: ["Auth Provider", "Featured"],
    description: "Send messages, schedule meetings, and collaborate with Microsoft Teams",
    logo: "https://statics.teams.cdn.office.net/hashedassets/favicon/favicon-96x96.png",
    capabilities: { tools: 15, resources: 8, prompts: 5 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/teams",
    featured: true
  },
  {
    id: "discord",
    name: "Discord",
    designation: "Community",
    category: "Social & Communication",
    tags: ["BYOC"],
    description: "Create and manage Discord servers, channels, and bot interactions",
    logo: "https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6918e57475a843f59f_icon_clyde_black_RGB.svg",
    capabilities: { tools: 10, resources: 5, prompts: 3 },
    auth_method: "Bot Token",
    endpoint: "https://arcade.dev/mcp/discord",
    featured: false
  },
  {
    id: "zoom",
    name: "Zoom",
    designation: "Verified",
    category: "Social & Communication",
    tags: ["Auth Provider"],
    description: "Schedule and manage video meetings, webinars, and recordings",
    logo: "https://st1.zoom.us/static/6.3.19840/image/new/ZoomLogo.png",
    capabilities: { tools: 9, resources: 4, prompts: 2 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/zoom",
    featured: false
  },
  {
    id: "dropbox",
    name: "Dropbox",
    designation: "Arcade Starter",
    category: "Productivity & Docs",
    tags: ["Auth Provider"],
    description: "Access, share, and manage files in Dropbox cloud storage",
    logo: "https://cfl.dropboxstatic.com/static/images/logo_catalog/blue_dropbox_glyph-vflJ8_vtT.png",
    capabilities: { tools: 11, resources: 6, prompts: 2 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/dropbox",
    featured: false
  },
  {
    id: "box",
    name: "Box",
    designation: "Verified",
    category: "Productivity & Docs",
    tags: ["Auth Provider"],
    description: "Enterprise content management with secure file sharing and collaboration",
    logo: "https://account.box.com/favicon.ico",
    capabilities: { tools: 12, resources: 7, prompts: 3 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/box",
    featured: false
  },
  {
    id: "onedrive",
    name: "OneDrive",
    designation: "Arcade Optimized",
    category: "Productivity & Docs",
    tags: ["Auth Provider"],
    description: "Microsoft's cloud storage for files, photos, and document collaboration",
    logo: "https://res.cdn.office.net/files/fabric-cdn-prod_20230815.002/assets/brand-icons/product/svg/onedrive_48x1.svg",
    capabilities: { tools: 10, resources: 6, prompts: 2 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/onedrive",
    featured: false
  },
  {
    id: "gitlab",
    name: "GitLab",
    designation: "Verified",
    category: "Developer Tools",
    tags: ["Auth Provider"],
    description: "Complete DevOps platform for repository management, CI/CD, and issue tracking",
    logo: "https://about.gitlab.com/images/press/logo/png/gitlab-icon-rgb.png",
    capabilities: { tools: 17, resources: 9, prompts: 4 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/gitlab",
    featured: false
  },
  {
    id: "bitbucket",
    name: "Bitbucket",
    designation: "Community",
    category: "Developer Tools",
    tags: ["Auth Provider"],
    description: "Git repository management with built-in CI/CD and code review",
    logo: "https://wac-cdn.atlassian.com/assets/img/favicons/bitbucket/favicon.png",
    capabilities: { tools: 14, resources: 7, prompts: 3 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/bitbucket",
    featured: false
  },
  {
    id: "linear",
    name: "Linear",
    designation: "Arcade Optimized",
    category: "Productivity & Docs",
    tags: ["Auth Provider", "Featured"],
    description: "Modern issue tracking and project management for software teams",
    logo: "https://asset.brandfetch.io/idZAyF9rlg/id3nfZPdlj.png",
    capabilities: { tools: 12, resources: 6, prompts: 4 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/linear",
    featured: true
  },
  {
    id: "intercom",
    name: "Intercom",
    designation: "Verified",
    category: "Customer Support",
    tags: ["Auth Provider"],
    description: "Customer messaging platform with live chat, bots, and help desk",
    logo: "https://www.intercom.com/favicon.ico",
    capabilities: { tools: 13, resources: 6, prompts: 4 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/intercom",
    featured: false
  },
  {
    id: "freshdesk",
    name: "Freshdesk",
    designation: "Community",
    category: "Customer Support",
    tags: ["BYOC"],
    description: "Cloud-based helpdesk software for ticket management and support",
    logo: "https://www.freshworks.com/static-assets/images/favicon.ico",
    capabilities: { tools: 11, resources: 5, prompts: 3 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/freshdesk",
    featured: false
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    designation: "Arcade Starter",
    category: "Marketing & Ads",
    tags: ["Auth Provider"],
    description: "Email marketing automation, campaigns, and audience management",
    logo: "https://eep.io/images/yzco4xsimv0y/5fxInquDLG3GWJy6Qlh18/e977e18546e0c90e3869b9e00c46e67f/freddie_favicon.ico",
    capabilities: { tools: 12, resources: 6, prompts: 4 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/mailchimp",
    featured: false
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    designation: "Verified",
    category: "Marketing & Ads",
    tags: ["BYOC"],
    description: "Email delivery service with marketing campaigns and transactional emails",
    logo: "https://sendgrid.com/favicon.ico",
    capabilities: { tools: 10, resources: 4, prompts: 3 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/sendgrid",
    featured: false
  },
  {
    id: "twilio",
    name: "Twilio",
    designation: "Verified",
    category: "Social & Communication",
    tags: ["BYOC", "Featured"],
    description: "SMS, voice, video, and email communications platform",
    logo: "https://www.twilio.com/favicon.ico",
    capabilities: { tools: 15, resources: 7, prompts: 5 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/twilio",
    featured: true
  },
  {
    id: "shopify",
    name: "Shopify",
    designation: "Arcade Optimized",
    category: "E-commerce",
    tags: ["Auth Provider", "Featured"],
    description: "Complete e-commerce platform for online stores and retail point-of-sale",
    logo: "https://cdn.shopify.com/shopifycloud/brochure/assets/brand-assets/shopify-logo-shopping-bag-full-color-66166b2e55d67988b56b4bd28b63c271e2b9713358cb723070a92bde17ad7d63.svg",
    capabilities: { tools: 20, resources: 12, prompts: 6 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/shopify",
    featured: true
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    designation: "Community",
    category: "E-commerce",
    tags: ["BYOC"],
    description: "WordPress e-commerce plugin for online store management",
    logo: "https://woocommerce.com/wp-content/themes/woo/images/logo-woocommerce.svg",
    capabilities: { tools: 14, resources: 8, prompts: 4 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/woocommerce",
    featured: false
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    designation: "Arcade Optimized",
    category: "Analytics & Data",
    tags: ["Auth Provider", "Featured"],
    description: "Web analytics service tracking website traffic and user behavior",
    logo: "https://www.google.com/analytics/img/favicons/favicon.ico",
    capabilities: { tools: 13, resources: 7, prompts: 5 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/google-analytics",
    featured: true
  },
  {
    id: "mixpanel",
    name: "Mixpanel",
    designation: "Verified",
    category: "Analytics & Data",
    tags: ["BYOC"],
    description: "Product analytics platform for tracking user interactions and behavior",
    logo: "https://mixpanel.com/favicon.ico",
    capabilities: { tools: 11, resources: 6, prompts: 4 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/mixpanel",
    featured: false
  },
  {
    id: "amplitude",
    name: "Amplitude",
    designation: "Community",
    category: "Analytics & Data",
    tags: ["BYOC"],
    description: "Digital analytics platform for product intelligence and user insights",
    logo: "https://amplitude.com/favicon.ico",
    capabilities: { tools: 10, resources: 5, prompts: 3 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/amplitude",
    featured: false
  },
  {
    id: "segment",
    name: "Segment",
    designation: "Verified",
    category: "Analytics & Data",
    tags: ["BYOC"],
    description: "Customer data platform collecting, cleaning, and routing analytics data",
    logo: "https://segment.com/favicon.ico",
    capabilities: { tools: 12, resources: 6, prompts: 4 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/segment",
    featured: false
  },
  {
    id: "figma",
    name: "Figma",
    designation: "Arcade Optimized",
    category: "Design & Creative",
    tags: ["Auth Provider", "Featured"],
    description: "Collaborative design tool for UI/UX design, prototyping, and teamwork",
    logo: "https://static.figma.com/app/icon/1/favicon.png",
    capabilities: { tools: 14, resources: 8, prompts: 5 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/figma",
    featured: true
  },
  {
    id: "canva",
    name: "Canva",
    designation: "Community",
    category: "Design & Creative",
    tags: ["Auth Provider"],
    description: "Graphic design platform for creating visual content and marketing materials",
    logo: "https://static.canva.com/web/images/favicon.ico",
    capabilities: { tools: 9, resources: 4, prompts: 3 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/canva",
    featured: false
  },
  {
    id: "adobe-creative-cloud",
    name: "Adobe Creative Cloud",
    designation: "Verified",
    category: "Design & Creative",
    tags: ["Auth Provider"],
    description: "Suite of creative apps including Photoshop, Illustrator, and Premiere Pro",
    logo: "https://www.adobe.com/favicon.ico",
    capabilities: { tools: 16, resources: 9, prompts: 5 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/adobe",
    featured: false
  },
  {
    id: "twitter",
    name: "Twitter/X",
    designation: "Verified",
    category: "Social & Communication",
    tags: ["Auth Provider"],
    description: "Post tweets, manage followers, and analyze social media engagement",
    logo: "https://abs.twimg.com/favicons/twitter.3.ico",
    capabilities: { tools: 13, resources: 6, prompts: 4 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/twitter",
    featured: false
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    designation: "Arcade Starter",
    category: "Social & Communication",
    tags: ["Auth Provider"],
    description: "Professional networking with posts, connections, and company management",
    logo: "https://static.licdn.com/sc/h/al2o9zrvru7aqj8e1x2rzsrca",
    capabilities: { tools: 12, resources: 6, prompts: 4 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/linkedin",
    featured: false
  },
  {
    id: "facebook",
    name: "Facebook",
    designation: "Community",
    category: "Social & Communication",
    tags: ["Auth Provider"],
    description: "Social media platform for posts, pages, and advertising campaigns",
    logo: "https://static.xx.fbcdn.net/rsrc.php/yo/r/iRmz9lCMBD2.ico",
    capabilities: { tools: 14, resources: 7, prompts: 5 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/facebook",
    featured: false
  },
  {
    id: "instagram",
    name: "Instagram",
    designation: "Verified",
    category: "Social & Communication",
    tags: ["Auth Provider"],
    description: "Photo and video sharing with stories, reels, and business features",
    logo: "https://static.cdninstagram.com/rsrc.php/v3/yG/r/De-Dwpd5CHc.png",
    capabilities: { tools: 11, resources: 5, prompts: 3 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/instagram",
    featured: false
  },
  {
    id: "youtube",
    name: "YouTube",
    designation: "Arcade Starter",
    category: "Social & Communication",
    tags: ["Auth Provider"],
    description: "Video platform for uploads, channel management, and analytics",
    logo: "https://www.youtube.com/s/desktop/favicon.ico",
    capabilities: { tools: 13, resources: 7, prompts: 4 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/youtube",
    featured: false
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    designation: "Verified",
    category: "Payments & Finance",
    tags: ["Auth Provider", "Pro"],
    description: "Accounting software for invoicing, expense tracking, and financial reporting",
    logo: "https://intuit-cg-us-prod-us-west-2-01.s3-us-west-2.amazonaws.com/qbo-product-logos/QBO_128.png",
    capabilities: { tools: 18, resources: 10, prompts: 6 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/quickbooks",
    featured: false
  },
  {
    id: "xero",
    name: "Xero",
    designation: "Verified",
    category: "Payments & Finance",
    tags: ["Auth Provider", "Pro"],
    description: "Cloud accounting platform for small business financial management",
    logo: "https://www.xero.com/favicon.ico",
    capabilities: { tools: 17, resources: 9, prompts: 5 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/xero",
    featured: false
  },
  {
    id: "paypal",
    name: "PayPal",
    designation: "Arcade Optimized",
    category: "Payments & Finance",
    tags: ["Auth Provider"],
    description: "Online payment processing for transactions, invoices, and subscriptions",
    logo: "https://www.paypalobjects.com/webstatic/icon/pp32.png",
    capabilities: { tools: 14, resources: 7, prompts: 4 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/paypal",
    featured: false
  },
  {
    id: "square",
    name: "Square",
    designation: "Community",
    category: "Payments & Finance",
    tags: ["BYOC"],
    description: "Payment processing with point-of-sale and e-commerce solutions",
    logo: "https://squareup.com/favicon.ico",
    capabilities: { tools: 13, resources: 6, prompts: 4 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/square",
    featured: false
  },
  {
    id: "bamboohr",
    name: "BambooHR",
    designation: "Verified",
    category: "HR & Recruiting",
    tags: ["Auth Provider"],
    description: "Human resources software for employee data, hiring, and onboarding",
    logo: "https://www.bamboohr.com/favicon.ico",
    capabilities: { tools: 15, resources: 8, prompts: 5 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/bamboohr",
    featured: false
  },
  {
    id: "workday",
    name: "Workday",
    designation: "Verified",
    category: "HR & Recruiting",
    tags: ["Auth Provider", "Pro"],
    description: "Enterprise cloud applications for finance and human capital management",
    logo: "https://www.workday.com/favicon.ico",
    capabilities: { tools: 19, resources: 11, prompts: 6 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/workday",
    featured: false
  },
  {
    id: "greenhouse",
    name: "Greenhouse",
    designation: "Community",
    category: "HR & Recruiting",
    tags: ["BYOC"],
    description: "Applicant tracking system for recruiting and hiring workflows",
    logo: "https://www.greenhouse.io/favicon.ico",
    capabilities: { tools: 12, resources: 6, prompts: 4 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/greenhouse",
    featured: false
  },
  {
    id: "lever",
    name: "Lever",
    designation: "Community",
    category: "HR & Recruiting",
    tags: ["Auth Provider"],
    description: "Talent acquisition suite with ATS and CRM for recruiting teams",
    logo: "https://www.lever.co/favicon.ico",
    capabilities: { tools: 11, resources: 5, prompts: 3 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/lever",
    featured: false
  },
  {
    id: "calendly",
    name: "Calendly",
    designation: "Arcade Starter",
    category: "Productivity & Docs",
    tags: ["Auth Provider"],
    description: "Scheduling automation for meetings, appointments, and events",
    logo: "https://assets.calendly.com/assets/external/favicon-54658ab8606bd53ec4adc3c5a80c3a5c.ico",
    capabilities: { tools: 9, resources: 4, prompts: 3 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/calendly",
    featured: false
  },
  {
    id: "typeform",
    name: "Typeform",
    designation: "Community",
    category: "Productivity & Docs",
    tags: ["Auth Provider"],
    description: "Interactive forms and surveys with conversational design",
    logo: "https://www.typeform.com/favicon.ico",
    capabilities: { tools: 10, resources: 5, prompts: 3 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/typeform",
    featured: false
  },
  {
    id: "surveymonkey",
    name: "SurveyMonkey",
    designation: "Community",
    category: "Productivity & Docs",
    tags: ["BYOC"],
    description: "Online survey software for collecting and analyzing feedback",
    logo: "https://www.surveymonkey.com/favicon.ico",
    capabilities: { tools: 9, resources: 4, prompts: 2 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/surveymonkey",
    featured: false
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    designation: "Arcade Optimized",
    category: "Productivity & Docs",
    tags: ["Auth Provider", "Featured"],
    description: "Schedule and manage events, meetings, and appointments",
    logo: "https://ssl.gstatic.com/calendar/images/favicon_v2018_256.png",
    capabilities: { tools: 11, resources: 5, prompts: 3 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/google-calendar",
    featured: true
  },
  {
    id: "google-sheets",
    name: "Google Sheets",
    designation: "Arcade Optimized",
    category: "Productivity & Docs",
    tags: ["Auth Provider", "Featured"],
    description: "Create and manage spreadsheets with real-time collaboration",
    logo: "https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico",
    capabilities: { tools: 13, resources: 7, prompts: 4 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/google-sheets",
    featured: true
  },
  {
    id: "microsoft-excel",
    name: "Microsoft Excel",
    designation: "Verified",
    category: "Productivity & Docs",
    tags: ["Auth Provider"],
    description: "Spreadsheet software for data analysis, calculations, and visualization",
    logo: "https://res.cdn.office.net/files/fabric-cdn-prod_20230815.002/assets/brand-icons/product/svg/excel_48x1.svg",
    capabilities: { tools: 12, resources: 6, prompts: 4 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/excel",
    featured: false
  },
  {
    id: "microsoft-outlook",
    name: "Microsoft Outlook",
    designation: "Arcade Optimized",
    category: "Productivity & Docs",
    tags: ["Auth Provider"],
    description: "Email client with calendar, contacts, and task management",
    logo: "https://res.cdn.office.net/files/fabric-cdn-prod_20230815.002/assets/brand-icons/product/svg/outlook_48x1.svg",
    capabilities: { tools: 14, resources: 7, prompts: 5 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/outlook",
    featured: false
  },
  {
    id: "evernote",
    name: "Evernote",
    designation: "Community",
    category: "Productivity & Docs",
    tags: ["Auth Provider"],
    description: "Note-taking app for organizing information, tasks, and ideas",
    logo: "https://evernote.com/favicon.ico",
    capabilities: { tools: 10, resources: 5, prompts: 3 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/evernote",
    featured: false
  },
  {
    id: "zapier",
    name: "Zapier",
    designation: "Verified",
    category: "Automation",
    tags: ["Auth Provider", "Featured"],
    description: "Automation platform connecting apps and workflows without code",
    logo: "https://cdn.zapier.com/ssr/6eb62b4dafe36e5ab67d1b8f99e2f773a15e0ca0/_next/static/images/favicon-4c8e32d418f97a828a4e11c8e4ab4cdb.ico",
    capabilities: { tools: 16, resources: 8, prompts: 5 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/zapier",
    featured: true
  },
  {
    id: "make",
    name: "Make (Integromat)",
    designation: "Community",
    category: "Automation",
    tags: ["BYOC"],
    description: "Visual platform for building complex automation workflows and integrations",
    logo: "https://www.make.com/favicon.ico",
    capabilities: { tools: 15, resources: 8, prompts: 4 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/make",
    featured: false
  },
  {
    id: "n8n",
    name: "n8n",
    designation: "Community",
    category: "Automation",
    tags: ["BYOC"],
    description: "Open-source workflow automation tool with fair-code distribution",
    logo: "https://n8n.io/favicon.ico",
    capabilities: { tools: 14, resources: 7, prompts: 4 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/n8n",
    featured: false
  },
  {
    id: "aws",
    name: "AWS",
    designation: "Verified",
    category: "Cloud & Infrastructure",
    tags: ["BYOC", "Pro"],
    description: "Amazon Web Services cloud computing platform and APIs",
    logo: "https://a0.awsstatic.com/libra-css/images/site/fav/favicon.ico",
    capabilities: { tools: 25, resources: 15, prompts: 8 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/aws",
    featured: false
  },
  {
    id: "azure",
    name: "Microsoft Azure",
    designation: "Verified",
    category: "Cloud & Infrastructure",
    tags: ["Auth Provider", "Pro"],
    description: "Cloud computing services for building and managing applications",
    logo: "https://azure.microsoft.com/favicon.ico",
    capabilities: { tools: 24, resources: 14, prompts: 7 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/azure",
    featured: false
  },
  {
    id: "google-cloud",
    name: "Google Cloud",
    designation: "Verified",
    category: "Cloud & Infrastructure",
    tags: ["Auth Provider", "Pro"],
    description: "Cloud computing services including compute, storage, and machine learning",
    logo: "https://www.gstatic.com/devrel-devsite/prod/v22b98b9e59aae933054f2c8a908f2a80dff5cc5e0d6ee5e07c3e2090da20c413/cloud/images/favicons/onecloud/favicon.ico",
    capabilities: { tools: 23, resources: 13, prompts: 7 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/google-cloud",
    featured: false
  },
  {
    id: "heroku",
    name: "Heroku",
    designation: "Community",
    category: "Cloud & Infrastructure",
    tags: ["BYOC"],
    description: "Cloud platform for deploying and managing applications",
    logo: "https://www.herokucdn.com/favicons/favicon.ico",
    capabilities: { tools: 12, resources: 6, prompts: 3 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/heroku",
    featured: false
  },
  {
    id: "vercel",
    name: "Vercel",
    designation: "Community",
    category: "Cloud & Infrastructure",
    tags: ["BYOC"],
    description: "Frontend cloud platform for deploying web applications and sites",
    logo: "https://assets.vercel.com/image/upload/front/favicon/vercel/favicon.ico",
    capabilities: { tools: 11, resources: 5, prompts: 3 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/vercel",
    featured: false
  },
  {
    id: "netlify",
    name: "Netlify",
    designation: "Community",
    category: "Cloud & Infrastructure",
    tags: ["Auth Provider"],
    description: "Platform for deploying and hosting modern web applications",
    logo: "https://www.netlify.com/favicon.ico",
    capabilities: { tools: 10, resources: 5, prompts: 3 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/netlify",
    featured: false
  },
  {
    id: "datadog",
    name: "Datadog",
    designation: "Verified",
    category: "Monitoring & Observability",
    tags: ["BYOC"],
    description: "Monitoring and analytics platform for infrastructure and applications",
    logo: "https://static.datadoghq.com/static/d/favicons/favicon-32x32.png",
    capabilities: { tools: 16, resources: 9, prompts: 5 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/datadog",
    featured: false
  },
  {
    id: "pagerduty",
    name: "PagerDuty",
    designation: "Verified",
    category: "Monitoring & Observability",
    tags: ["Auth Provider"],
    description: "Incident management platform for real-time operations",
    logo: "https://www.pagerduty.com/favicon.ico",
    capabilities: { tools: 13, resources: 6, prompts: 4 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/pagerduty",
    featured: false
  },
  {
    id: "sentry",
    name: "Sentry",
    designation: "Community",
    category: "Monitoring & Observability",
    tags: ["BYOC"],
    description: "Error tracking and performance monitoring for applications",
    logo: "https://sentry.io/_assets/sentry-logo-C5C646E3.svg",
    capabilities: { tools: 11, resources: 5, prompts: 3 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/sentry",
    featured: false
  },
  {
    id: "snowflake",
    name: "Snowflake",
    designation: "Verified",
    category: "Databases",
    tags: ["BYOC", "Pro"],
    description: "Cloud data platform for data warehousing and analytics",
    logo: "https://www.snowflake.com/favicon.ico",
    capabilities: { tools: 17, resources: 10, prompts: 5 },
    auth_method: "OAuth 2.0",
    endpoint: "https://arcade.dev/mcp/snowflake",
    featured: false
  },
  {
    id: "mongodb",
    name: "MongoDB",
    designation: "Community",
    category: "Databases",
    tags: ["BYOC"],
    description: "NoSQL document database for modern application development",
    logo: "https://www.mongodb.com/assets/images/global/favicon.ico",
    capabilities: { tools: 14, resources: 8, prompts: 4 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/mongodb",
    featured: false
  },
  {
    id: "redis",
    name: "Redis",
    designation: "Community",
    category: "Databases",
    tags: ["BYOC"],
    description: "In-memory data structure store for caching and real-time applications",
    logo: "https://redis.io/favicon.ico",
    capabilities: { tools: 12, resources: 6, prompts: 3 },
    auth_method: "API Key",
    endpoint: "https://arcade.dev/mcp/redis",
    featured: false
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    designation: "Community",
    category: "Databases",
    tags: ["BYOC"],
    description: "Open-source relational database with advanced features",
    logo: "https://www.postgresql.org/favicon.ico",
    capabilities: { tools: 15, resources: 9, prompts: 4 },
    auth_method: "Connection String",
    endpoint: "https://arcade.dev/mcp/postgres",
    featured: false
  }
];

async function fetchFromArcade(path: string, options: RequestInit = {}) {
  if (!ARCADE_API_KEY) {
    console.warn('[arcade-servers] ARCADE_API_KEY not configured, using mock data');
    return null;
  }

  try {
    console.log(`[arcade-servers] Fetching from Arcade: ${ARCADE_API_BASE}${path}`);
    const response = await fetch(`${ARCADE_API_BASE}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${ARCADE_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Arcade-Client': 'M2M-Builder',
        ...options.headers,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`[arcade-servers] Arcade API error: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error(`[arcade-servers] Error body:`, errorBody);
      return null;
    }

    const data = await response.json();
    console.log(`[arcade-servers] Arcade API raw response:`, JSON.stringify(data).substring(0, 500));
    console.log(`[arcade-servers] Response keys:`, Object.keys(data));
    console.log(`[arcade-servers] Arcade API success, received ${data?.tools?.length || data?.length || 0} items`);
    return data;
  } catch (error) {
    console.error('[arcade-servers] Arcade API request failed:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // GET /arcade-servers - List servers with filters and pagination
    if (req.method === 'GET' && pathParts.length === 1) {
      const category = url.searchParams.get('category');
      const type = url.searchParams.get('type');
      const features = url.searchParams.get('features');
      const q = url.searchParams.get('q')?.toLowerCase();
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '48');

      // Try to fetch from Arcade API first with large limit to get all servers
      const arcadeParams = new URLSearchParams();
      arcadeParams.set('limit', '200'); // Fetch all servers in one call
      if (category) arcadeParams.set('category', category);
      if (type) arcadeParams.set('type', type);
      if (features) arcadeParams.set('features', features);
      if (q) arcadeParams.set('q', q);

      const arcadeData = await fetchFromArcade(`/v1/tools${arcadeParams.toString() ? '?' + arcadeParams.toString() : ''}`);
      
      // Transform Arcade tools into our server format
      let filtered = arcadeData?.tools?.map((tool: any) => ({
        id: tool.name || tool.id,
        name: tool.title || tool.name,
        logo: tool.icon || tool.logo,
        designation: tool.tier === 'optimized' ? 'Arcade Optimized' : 
                     tool.tier === 'starter' ? 'Arcade Starter' :
                     tool.tier === 'verified' ? 'Verified' : 'Community',
        category: tool.category || 'Uncategorized',
        tags: tool.tags || [],
        description: tool.description || '',
        capabilities: tool.capabilities || { tools: 1, resources: 0, prompts: 0 },
        auth_method: tool.requirements?.authorization?.provider_type || 'API Key',
        endpoint: `https://api.arcade.dev/v1/tools/${tool.name}`,
        featured: tool.featured || false,
        status: tool.status || 'available'
      })) || MOCK_SERVERS;

      console.log(`[arcade-servers] Fetched ${filtered.length} servers from Arcade API`);

      // Client-side filtering for more control (only if not already filtered by API)
      if (!arcadeData && category) {
        filtered = filtered.filter((s: any) => s.category === category);
      }

      if (!arcadeData && type) {
        const typeList = type.split(',').map(t => t.trim().toLowerCase());
        filtered = filtered.filter((s: any) =>
          typeList.some(t => 
            s.designation?.toLowerCase().includes(t) ||
            (t === 'auth' && s.tags?.includes('Auth Provider'))
          )
        );
      }

      if (!arcadeData && features) {
        const featureList = features.split(',').map(f => f.trim().toUpperCase());
        filtered = filtered.filter((s: any) =>
          featureList.some((f: string) => 
            s.tags?.some((tag: string) => tag.toUpperCase() === f)
          )
        );
      }

      if (!arcadeData && q) {
        filtered = filtered.filter((s: any) =>
          s.name?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.category?.toLowerCase().includes(q) ||
          s.tags?.some((t: string) => t.toLowerCase().includes(q))
        );
      }

      const total = filtered.length;
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginated = filtered.slice(start, end);

      console.log(`[arcade-servers] Total: ${total} results, page ${page}/${Math.ceil(total / limit)}, showing ${paginated.length} items`);

      return new Response(JSON.stringify({ 
        items: paginated,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      }), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
        }
      });
    }

    // GET /arcade-servers/:id - Get server details
    if (req.method === 'GET' && pathParts.length === 2) {
      const serverId = pathParts[1];
      const server = MOCK_SERVERS.find(s => s.id === serverId);

      if (!server) {
        return new Response(JSON.stringify({ error: 'Server not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`Arcade server details: ${server.name}`);

      return new Response(JSON.stringify({ server }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /arcade-servers/:id/register - Register Arcade server
    if (req.method === 'POST' && pathParts.length === 3 && pathParts[2] === 'register') {
      const serverId = pathParts[1];
      const { system_id } = await req.json();

      if (!system_id) {
        return new Response(JSON.stringify({ error: 'Missing system_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const server = MOCK_SERVERS.find(s => s.id === serverId);
      if (!server) {
        return new Response(JSON.stringify({ error: 'Server not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update intelligence_settings with arcade_server_id
      const { error: updateError } = await supabase
        .from('intelligence_settings')
        .upsert({
          system_id,
          arcade_registry: true,
          arcade_server_id: serverId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'system_id'
        });

      if (updateError) throw updateError;

      console.log(`Registered Arcade server ${server.name} for system ${system_id}`);

      return new Response(JSON.stringify({ 
        success: true,
        server_id: serverId,
        server_name: server.name,
        endpoint: server.endpoint
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Arcade servers error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
