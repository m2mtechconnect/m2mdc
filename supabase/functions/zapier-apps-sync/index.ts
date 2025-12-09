import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive Zapier app data covering major categories with 10+ apps each
const ZAPIER_APPS_DATA = [
  // Productivity Apps (15 apps)
  { id: "google-sheets", name: "Google Sheets", description: "Create, edit, and share spreadsheets wherever you are.", category: ["Productivity", "Spreadsheets"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/6d02487d0a8a1e42d2eb9af5b94c2cc4.png", connections_count: 1250000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "notion", name: "Notion", description: "All-in-one workspace for notes, tasks, wikis, and databases.", category: ["Productivity", "Notes"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/8f9e7c6a5d3b2e1c9f8e7c6a5d3b2e1c.png", connections_count: 720000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "airtable", name: "Airtable", description: "Cloud collaboration combining spreadsheet flexibility with database features.", category: ["Productivity", "Databases"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/5a65ced0c8ef54a75e3e8f0c8ec85b2c.png", connections_count: 540000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "evernote", name: "Evernote", description: "Note taking and organization app to capture ideas and information.", category: ["Productivity", "Notes"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/evernote-icon.png", connections_count: 480000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "todoist", name: "Todoist", description: "Simple yet powerful to-do list and task manager.", category: ["Productivity", "Task Management"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/todoist-icon.png", connections_count: 390000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "microsoft-onenote", name: "Microsoft OneNote", description: "Digital notebook for capturing and organizing information.", category: ["Productivity", "Notes", "Microsoft"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/onenote-icon.png", connections_count: 410000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "google-docs", name: "Google Docs", description: "Create and collaborate on documents online.", category: ["Productivity", "Documents"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/google-docs-icon.png", connections_count: 980000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "microsoft-excel", name: "Microsoft Excel", description: "Powerful spreadsheet application for data analysis.", category: ["Productivity", "Spreadsheets", "Microsoft"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/excel-icon.png", connections_count: 850000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "clickup", name: "ClickUp", description: "All-in-one productivity platform for teams.", category: ["Productivity", "Project Management"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/clickup-icon.png", connections_count: 320000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "coda", name: "Coda", description: "All-in-one doc that brings words, data, and teams together.", category: ["Productivity", "Documents"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/coda-icon.png", connections_count: 180000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "quip", name: "Quip", description: "Collaborative productivity software for teams.", category: ["Productivity", "Collaboration"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/quip-icon.png", connections_count: 140000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "bear", name: "Bear", description: "Beautiful, flexible writing app for notes and prose.", category: ["Productivity", "Notes"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/bear-icon.png", connections_count: 95000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "roam-research", name: "Roam Research", description: "Note-taking tool for networked thought.", category: ["Productivity", "Notes"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/roam-icon.png", connections_count: 72000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "obsidian", name: "Obsidian", description: "Powerful knowledge base on top of local markdown files.", category: ["Productivity", "Notes"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/obsidian-icon.png", connections_count: 120000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "craft", name: "Craft", description: "Native notes app built for Apple devices.", category: ["Productivity", "Notes"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/craft-icon.png", connections_count: 85000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },

  // Communication Apps (12 apps)
  { id: "slack", name: "Slack", description: "Platform for team communication in one place.", category: ["Communication", "Team Chat"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/6cf3f5e732e7415c4ba3c68f5e3c6c5a.128x128.png", connections_count: 2100000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "gmail", name: "Gmail", description: "Google's email service for sending and receiving emails.", category: ["Communication", "Email"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/48d97a0c05c4fb5f22cd97bd80c6e1f2.png", connections_count: 1800000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "microsoft-teams", name: "Microsoft Teams", description: "Hub for team collaboration in Microsoft 365.", category: ["Communication", "Team Chat"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/4c8f9e7a6d3b2e1c9f8e7c6a5d3b2e1c.png", connections_count: 980000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "discord", name: "Discord", description: "Voice, video, and text communication for communities.", category: ["Communication", "Team Chat"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/discord-icon.png", connections_count: 680000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "zoom", name: "Zoom", description: "Video conferencing and web conferencing service.", category: ["Communication", "Video Conferencing"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/zoom-icon.png", connections_count: 920000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "microsoft-outlook", name: "Microsoft Outlook", description: "Email and calendar service from Microsoft.", category: ["Communication", "Email", "Calendar"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/outlook-icon.png", connections_count: 1200000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "telegram", name: "Telegram", description: "Cloud-based instant messaging service.", category: ["Communication", "Messaging"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/telegram-icon.png", connections_count: 420000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "whatsapp", name: "WhatsApp Business", description: "Business messaging on WhatsApp.", category: ["Communication", "Messaging"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/whatsapp-icon.png", connections_count: 580000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "twilio", name: "Twilio", description: "Cloud communications platform for SMS and voice.", category: ["Communication", "SMS"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/twilio-icon.png", connections_count: 510000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "sendgrid", name: "SendGrid", description: "Email delivery service for transactional and marketing emails.", category: ["Communication", "Email"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/sendgrid-icon.png", connections_count: 380000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "postmark", name: "Postmark", description: "Fast and reliable transactional email service.", category: ["Communication", "Email"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/postmark-icon.png", connections_count: 145000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "front", name: "Front", description: "Shared inbox for teams.", category: ["Communication", "Email"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/front-icon.png", connections_count: 190000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },

  // CRM & Sales (12 apps)
  { id: "salesforce", name: "Salesforce", description: "Leading enterprise CRM platform.", category: ["CRM", "Sales"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/5c735e7d3b1a0f56a0d3d891e97a4ee4.png", connections_count: 890000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "hubspot", name: "HubSpot", description: "All-in-one inbound marketing, sales, and service platform.", category: ["CRM", "Marketing", "Sales"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/d01365509fd2ee00ea9fa7fb0a91eedd.png", connections_count: 750000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "pipedrive", name: "Pipedrive", description: "Sales CRM and pipeline management software.", category: ["CRM", "Sales"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/pipedrive-icon.png", connections_count: 380000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "zoho-crm", name: "Zoho CRM", description: "Customer relationship management software.", category: ["CRM", "Sales"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/zoho-icon.png", connections_count: 420000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "copper", name: "Copper", description: "CRM for Google Workspace.", category: ["CRM", "Sales"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/copper-icon.png", connections_count: 180000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "close", name: "Close", description: "CRM for inside sales teams.", category: ["CRM", "Sales"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/close-icon.png", connections_count: 95000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "insightly", name: "Insightly", description: "CRM and project management software.", category: ["CRM", "Project Management"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/insightly-icon.png", connections_count: 210000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "freshsales", name: "Freshsales", description: "Sales CRM software by Freshworks.", category: ["CRM", "Sales"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/freshsales-icon.png", connections_count: 160000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "nimble", name: "Nimble", description: "Simple, smart CRM for Office 365 and Google Workspace.", category: ["CRM", "Sales"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/nimble-icon.png", connections_count: 78000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "activecampaign", name: "ActiveCampaign", description: "Email marketing, marketing automation, and CRM.", category: ["CRM", "Marketing", "Email"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/activecampaign-icon.png", connections_count: 340000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "agile-crm", name: "Agile CRM", description: "All-in-one CRM with sales, marketing and service automation.", category: ["CRM", "Sales", "Marketing"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/agile-icon.png", connections_count: 125000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "monday-crm", name: "Monday CRM", description: "Customizable CRM built on Monday.com platform.", category: ["CRM", "Sales"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/monday-crm-icon.png", connections_count: 280000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },

  // Project Management (14 apps)
  { id: "trello", name: "Trello", description: "Team collaboration tool to organize projects.", category: ["Project Management", "Productivity"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/3c6e44a0fbefa0e4f29211a33442a1ec.png", connections_count: 920000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "asana", name: "Asana", description: "Work management platform for teams.", category: ["Project Management", "Productivity"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/7c6b3e8a2d9f3c5a8e1d7f9c3b5e8a2d.png", connections_count: 610000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "jira", name: "Jira", description: "Project management for agile teams.", category: ["Project Management", "Development"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/5e8c7f9a3d2b1e8c7f9a3d2b1e8c7f9a.png", connections_count: 820000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "monday", name: "Monday.com", description: "Work OS to run processes and workflows.", category: ["Project Management", "Productivity"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/1c9e8f7a6d3b2e9c8f7a5d3b2e1c9f8e.png", connections_count: 510000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "basecamp", name: "Basecamp", description: "Project management and team communication software.", category: ["Project Management", "Communication"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/basecamp-icon.png", connections_count: 380000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "wrike", name: "Wrike", description: "Professional project management software.", category: ["Project Management", "Productivity"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/wrike-icon.png", connections_count: 290000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "smartsheet", name: "Smartsheet", description: "Platform for work execution and collaboration.", category: ["Project Management", "Spreadsheets"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/smartsheet-icon.png", connections_count: 320000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "teamwork", name: "Teamwork", description: "Project management software for client work.", category: ["Project Management", "Productivity"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/teamwork-icon.png", connections_count: 175000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "pivotal-tracker", name: "Pivotal Tracker", description: "Agile project management tool.", category: ["Project Management", "Development"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/pivotal-icon.png", connections_count: 95000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "linear", name: "Linear", description: "Issue tracking tool for modern software teams.", category: ["Project Management", "Development"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/linear-icon.png", connections_count: 240000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "height", name: "Height", description: "Autonomous project collaboration tool.", category: ["Project Management", "Productivity"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/height-icon.png", connections_count: 68000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "microsoft-project", name: "Microsoft Project", description: "Project management software from Microsoft.", category: ["Project Management", "Microsoft"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/msproject-icon.png", connections_count: 410000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "teamgantt", name: "TeamGantt", description: "Gantt chart and project planning software.", category: ["Project Management", "Planning"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/teamgantt-icon.png", connections_count: 82000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "producthunt", name: "Product Hunt", description: "Platform for discovering new products.", category: ["Project Management", "Product"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/producthunt-icon.png", connections_count: 190000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },

  // Marketing & Email (13 apps)
  { id: "mailchimp", name: "Mailchimp", description: "Marketing automation with email marketing and CRM.", category: ["Marketing", "Email"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/4e8bb9e12d86a2c2a3c7eb7c01d2a1d3.png", connections_count: 680000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "constant-contact", name: "Constant Contact", description: "Email marketing and online survey tool.", category: ["Marketing", "Email"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/constant-contact-icon.png", connections_count: 290000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "convertkit", name: "ConvertKit", description: "Email marketing for creators.", category: ["Marketing", "Email"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/convertkit-icon.png", connections_count: 240000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "drip", name: "Drip", description: "E-commerce CRM and marketing automation.", category: ["Marketing", "Email", "E-commerce"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/drip-icon.png", connections_count: 150000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "klaviyo", name: "Klaviyo", description: "Email and SMS marketing platform for e-commerce.", category: ["Marketing", "Email", "E-commerce"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/klaviyo-icon.png", connections_count: 320000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "sendinblue", name: "Brevo (Sendinblue)", description: "Email marketing and marketing automation.", category: ["Marketing", "Email"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/sendinblue-icon.png", connections_count: 210000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "mailerlite", name: "MailerLite", description: "Email marketing tool for small businesses.", category: ["Marketing", "Email"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/mailerlite-icon.png", connections_count: 185000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "campaign-monitor", name: "Campaign Monitor", description: "Email marketing software for businesses.", category: ["Marketing", "Email"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/campaign-monitor-icon.png", connections_count: 170000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "getresponse", name: "GetResponse", description: "Email marketing with landing pages and webinars.", category: ["Marketing", "Email"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/getresponse-icon.png", connections_count: 195000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "aweber", name: "AWeber", description: "Email marketing and automation for small businesses.", category: ["Marketing", "Email"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/aweber-icon.png", connections_count: 160000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "buffer", name: "Buffer", description: "Social media management platform.", category: ["Marketing", "Social Media"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/buffer-icon.png", connections_count: 410000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "hootsuite", name: "Hootsuite", description: "Social media management and scheduling.", category: ["Marketing", "Social Media"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/hootsuite-icon.png", connections_count: 380000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "sprout-social", name: "Sprout Social", description: "Social media management and engagement.", category: ["Marketing", "Social Media"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/sprout-icon.png", connections_count: 220000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },

  // E-commerce (11 apps)
  { id: "shopify", name: "Shopify", description: "Complete commerce platform to start and grow a business.", category: ["E-commerce", "Sales"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/7e9c8f6a5d3b2e1c9f8e7c6a5d3b2e1c.png", connections_count: 650000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "woocommerce", name: "WooCommerce", description: "E-commerce platform for WordPress.", category: ["E-commerce", "WordPress"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/woocommerce-icon.png", connections_count: 520000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "bigcommerce", name: "BigCommerce", description: "E-commerce platform for growing businesses.", category: ["E-commerce", "Sales"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/bigcommerce-icon.png", connections_count: 180000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "magento", name: "Magento", description: "Open-source e-commerce platform.", category: ["E-commerce", "Sales"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/magento-icon.png", connections_count: 210000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "squarespace-commerce", name: "Squarespace Commerce", description: "E-commerce from Squarespace.", category: ["E-commerce", "Website Builder"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/squarespace-icon.png", connections_count: 290000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "square", name: "Square", description: "Payment processing and business solutions.", category: ["E-commerce", "Payment Processing"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/square-icon.png", connections_count: 480000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "etsy", name: "Etsy", description: "Marketplace for handmade and vintage items.", category: ["E-commerce", "Marketplace"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/etsy-icon.png", connections_count: 320000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "amazon-seller", name: "Amazon Seller Central", description: "Sell products on Amazon.", category: ["E-commerce", "Marketplace"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/amazon-icon.png", connections_count: 560000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "ebay", name: "eBay", description: "Online marketplace for buying and selling.", category: ["E-commerce", "Marketplace"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/ebay-icon.png", connections_count: 410000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "prestashop", name: "PrestaShop", description: "Open-source e-commerce solution.", category: ["E-commerce", "Sales"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/prestashop-icon.png", connections_count: 95000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "ecwid", name: "Ecwid", description: "E-commerce platform for existing websites.", category: ["E-commerce", "Sales"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/ecwid-icon.png", connections_count: 140000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },

  // Payment Processing (10 apps)
  { id: "stripe", name: "Stripe", description: "Payment platform for the internet.", category: ["Payment Processing", "Finance"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/2e9c8f7a6d3b1e9c8f7a5d2b1e9c8f7a.png", connections_count: 790000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "paypal", name: "PayPal", description: "Online payment system and money transfer service.", category: ["Payment Processing", "Finance"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/paypal-icon.png", connections_count: 890000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "braintree", name: "Braintree", description: "Payment gateway by PayPal.", category: ["Payment Processing", "Finance"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/braintree-icon.png", connections_count: 210000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "authorize-net", name: "Authorize.Net", description: "Payment gateway service provider.", category: ["Payment Processing", "Finance"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/authorize-icon.png", connections_count: 180000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "chargebee", name: "Chargebee", description: "Subscription billing and revenue management.", category: ["Payment Processing", "Subscriptions"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/chargebee-icon.png", connections_count: 95000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "recurly", name: "Recurly", description: "Subscription billing management platform.", category: ["Payment Processing", "Subscriptions"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/recurly-icon.png", connections_count: 68000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "paddle", name: "Paddle", description: "Payment infrastructure for SaaS companies.", category: ["Payment Processing", "SaaS"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/paddle-icon.png", connections_count: 120000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "gocardless", name: "GoCardless", description: "Bank payment solutions for recurring payments.", category: ["Payment Processing", "Finance"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/gocardless-icon.png", connections_count: 85000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "mollie", name: "Mollie", description: "European payment service provider.", category: ["Payment Processing", "Finance"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/mollie-icon.png", connections_count: 92000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "razorpay", name: "Razorpay", description: "Payment gateway for India.", category: ["Payment Processing", "Finance"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/razorpay-icon.png", connections_count: 140000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },

  // Customer Support (10 apps)
  { id: "zendesk", name: "Zendesk", description: "Customer service software and support ticket system.", category: ["Customer Support", "Help Desk"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/2c9f8e7a6d3b1e9c8f7a5d2b1e9c8f7a.png", connections_count: 490000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "intercom", name: "Intercom", description: "Customer messaging platform for sales and support.", category: ["Customer Support", "Communication"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/intercom-icon.png", connections_count: 380000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "freshdesk", name: "Freshdesk", description: "Customer support software and ticketing system.", category: ["Customer Support", "Help Desk"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/freshdesk-icon.png", connections_count: 290000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "helpscout", name: "Help Scout", description: "Help desk software for customer support teams.", category: ["Customer Support", "Help Desk"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/helpscout-icon.png", connections_count: 180000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "drift", name: "Drift", description: "Conversational marketing and sales platform.", category: ["Customer Support", "Sales", "Communication"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/drift-icon.png", connections_count: 210000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "livechat", name: "LiveChat", description: "Customer service software with live chat.", category: ["Customer Support", "Communication"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/livechat-icon.png", connections_count: 240000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "crisp", name: "Crisp", description: "Multichannel messaging platform for customer support.", category: ["Customer Support", "Communication"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/crisp-icon.png", connections_count: 125000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "kustomer", name: "Kustomer", description: "CRM and customer service platform.", category: ["Customer Support", "CRM"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/kustomer-icon.png", connections_count: 95000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "gorgias", name: "Gorgias", description: "Help desk for e-commerce businesses.", category: ["Customer Support", "E-commerce"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/gorgias-icon.png", connections_count: 110000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "gladly", name: "Gladly", description: "Customer service platform built for people.", category: ["Customer Support", "Communication"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/gladly-icon.png", connections_count: 72000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },

  // Forms & Surveys (10 apps)
  { id: "typeform", name: "Typeform", description: "Beautiful forms, surveys, and quizzes.", category: ["Forms", "Surveys"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/3e8c9f7a6d3b2e1c9f8e7c6a5d3b2e1c.png", connections_count: 380000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "google-forms", name: "Google Forms", description: "Create and analyze surveys for free.", category: ["Forms", "Surveys", "Google"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/google-forms-icon.png", connections_count: 920000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "jotform", name: "JotForm", description: "Form builder with 10,000+ templates.", category: ["Forms", "Data Collection"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/jotform-icon.png", connections_count: 410000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "surveymonkey", name: "SurveyMonkey", description: "Online survey development and analytics.", category: ["Surveys", "Forms"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/surveymonkey-icon.png", connections_count: 490000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "wufoo", name: "Wufoo", description: "Online form builder with cloud storage.", category: ["Forms", "Data Collection"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/wufoo-icon.png", connections_count: 210000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "formstack", name: "Formstack", description: "Workplace productivity platform with forms.", category: ["Forms", "Productivity"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/formstack-icon.png", connections_count: 140000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "cognito-forms", name: "Cognito Forms", description: "Online form builder with payment processing.", category: ["Forms", "Payment Processing"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/cognito-icon.png", connections_count: 95000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "formidable-forms", name: "Formidable Forms", description: "WordPress form builder.", category: ["Forms", "WordPress"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/formidable-icon.png", connections_count: 180000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "paperform", name: "Paperform", description: "Beautiful online forms and landing pages.", category: ["Forms", "Landing Pages"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/paperform-icon.png", connections_count: 85000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "qualtrics", name: "Qualtrics", description: "Experience management and survey platform.", category: ["Surveys", "Analytics"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/qualtrics-icon.png", connections_count: 220000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },

  // File Storage & Cloud (10 apps)
  { id: "dropbox", name: "Dropbox", description: "Cloud storage and file synchronization service.", category: ["File Storage", "Cloud Storage"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/9e3c8f7a5d2b1e9c8f7a5d2b1e9c8f7a.png", connections_count: 1100000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "google-drive", name: "Google Drive", description: "Cloud storage and file backup from Google.", category: ["File Storage", "Cloud Storage", "Google"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/google-drive-icon.png", connections_count: 1400000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "onedrive", name: "Microsoft OneDrive", description: "Cloud storage from Microsoft.", category: ["File Storage", "Cloud Storage", "Microsoft"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/onedrive-icon.png", connections_count: 820000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "box", name: "Box", description: "Secure cloud content management and file sharing.", category: ["File Storage", "Cloud Storage"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/box-icon.png", connections_count: 510000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "aws-s3", name: "Amazon S3", description: "Object storage service from AWS.", category: ["File Storage", "Cloud Storage", "AWS"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/s3-icon.png", connections_count: 380000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "sharepoint", name: "Microsoft SharePoint", description: "Document management and collaboration platform.", category: ["File Storage", "Collaboration", "Microsoft"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/sharepoint-icon.png", connections_count: 640000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "cloudinary", name: "Cloudinary", description: "Image and video management in the cloud.", category: ["File Storage", "Media"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/cloudinary-icon.png", connections_count: 180000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "imgur", name: "Imgur", description: "Online image hosting and sharing.", category: ["File Storage", "Images"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/imgur-icon.png", connections_count: 240000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "backblaze", name: "Backblaze B2", description: "Cloud storage and backup service.", category: ["File Storage", "Backup"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/backblaze-icon.png", connections_count: 95000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "mega", name: "MEGA", description: "Secure cloud storage with end-to-end encryption.", category: ["File Storage", "Cloud Storage"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/mega-icon.png", connections_count: 310000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },

  // Scheduling & Calendar (10 apps)
  { id: "calendly", name: "Calendly", description: "Modern scheduling platform that eliminates back-and-forth.", category: ["Scheduling", "Calendar"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/6c9e8f7a5d3b2e1c9f8e7c6a5d3b2e1c.png", connections_count: 340000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "google-calendar", name: "Google Calendar", description: "Time management and scheduling calendar service.", category: ["Calendar", "Scheduling", "Google"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/google-calendar-icon.png", connections_count: 1300000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "outlook-calendar", name: "Outlook Calendar", description: "Calendar service from Microsoft Outlook.", category: ["Calendar", "Scheduling", "Microsoft"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/outlook-calendar-icon.png", connections_count: 790000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "acuity-scheduling", name: "Acuity Scheduling", description: "Online appointment scheduling software.", category: ["Scheduling", "Appointments"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/acuity-icon.png", connections_count: 180000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "setmore", name: "Setmore", description: "Free online appointment scheduling calendar.", category: ["Scheduling", "Appointments"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/setmore-icon.png", connections_count: 140000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "doodle", name: "Doodle", description: "Meeting scheduling tool for groups.", category: ["Scheduling", "Meetings"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/doodle-icon.png", connections_count: 290000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "bookingcom", name: "Booking.com", description: "Online hotel and accommodation reservations.", category: ["Scheduling", "Bookings"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/booking-icon.png", connections_count: 510000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "simplybook", name: "SimplyBook.me", description: "Online booking system for services.", category: ["Scheduling", "Bookings"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/simplybook-icon.png", connections_count: 95000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "schedule-once", name: "ScheduleOnce", description: "Meeting scheduling and booking software.", category: ["Scheduling", "Meetings"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/scheduleonce-icon.png", connections_count: 115000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "x-ai", name: "x.ai", description: "AI personal assistant for scheduling meetings.", category: ["Scheduling", "AI"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/xai-icon.png", connections_count: 78000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },

  // Accounting & Finance (10 apps)
  { id: "quickbooks", name: "QuickBooks Online", description: "Accounting software for small businesses.", category: ["Accounting", "Finance"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/9c8e7f6a5d3b2e1c9f8e7c6a5d3b2e1c.png", connections_count: 420000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "xero", name: "Xero", description: "Online accounting software for small businesses.", category: ["Accounting", "Finance"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/xero-icon.png", connections_count: 310000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "freshbooks", name: "FreshBooks", description: "Cloud-based accounting software.", category: ["Accounting", "Finance"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/freshbooks-icon.png", connections_count: 240000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "wave", name: "Wave", description: "Free accounting software for small businesses.", category: ["Accounting", "Finance"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/wave-icon.png", connections_count: 290000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "zoho-books", name: "Zoho Books", description: "Online accounting software for small businesses.", category: ["Accounting", "Finance"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/zoho-books-icon.png", connections_count: 180000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "sage", name: "Sage Business Cloud", description: "Accounting and business management software.", category: ["Accounting", "Finance"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/sage-icon.png", connections_count: 210000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" },
  { id: "invoice-ninja", name: "Invoice Ninja", description: "Free online invoicing for freelancers.", category: ["Accounting", "Invoicing"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/invoice-ninja-icon.png", connections_count: 95000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "harvest", name: "Harvest", description: "Time tracking and invoicing software.", category: ["Accounting", "Time Tracking"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/harvest-icon.png", connections_count: 280000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "expensify", name: "Expensify", description: "Expense management and receipt tracking.", category: ["Accounting", "Expenses"], status: "active", premium: false, logo_url: "https://cdn.zapier.com/storage/services/expensify-icon.png", connections_count: 320000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "free" },
  { id: "concur", name: "SAP Concur", description: "Travel and expense management software.", category: ["Accounting", "Expenses"], status: "active", premium: true, logo_url: "https://cdn.zapier.com/storage/services/concur-icon.png", connections_count: 250000, auth_type: "oauth2", supports_triggers: true, supports_actions: true, pricing_tier: "premium" }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting Zapier apps sync...');
    const startTime = Date.now();

    const zapierBaseUrl = Deno.env.get('ZAPIER_BASE_URL') || 'https://api.zapier.com';
    const zapierClientId = Deno.env.get('ZAPIER_CLIENT_ID');
    
    let apps = ZAPIER_APPS_DATA;
    
    // If Lovable credentials are configured, fetch from Zapier API
    if (zapierClientId) {
      try {
        console.log('Fetching apps from Zapier API with Lovable credentials...');
        const response = await fetch(`${zapierBaseUrl}/v1/apps`, {
          headers: {
            'Accept': 'application/json',
            'Client-Id': zapierClientId,
          },
        });

        if (response.ok) {
          const data = await response.json();
          apps = data.apps?.map((app: any) => ({
            id: app.key || app.id,
            name: app.title || app.name,
            description: app.description || '',
            logo_url: app.image_url || app.logo,
            category: app.categories || ['Other'],
            status: app.api_status === 'live' ? 'active' : 'beta',
            premium: app.premium || false,
            pricing_tier: app.premium ? 'premium' : 'free',
            connections_count: app.users_count || 0,
            auth_type: app.authentication_type || 'oauth2',
            supports_triggers: app.has_triggers !== false,
            supports_actions: app.has_actions !== false,
          })) || ZAPIER_APPS_DATA;
          console.log(`Fetched ${apps.length} apps from Zapier API`);
        } else {
          console.warn('Zapier API returned non-OK status, using mock data');
        }
      } catch (apiError) {
        console.warn('Failed to fetch from Zapier API, using mock data:', apiError);
      }
    } else {
      console.log('No Zapier credentials configured, using mock data');
    }

    // Upsert apps into database
    const { data: upsertedApps, error: upsertError } = await supabase
      .from('zapier_apps')
      .upsert(
        apps.map(app => ({
          ...app,
          last_synced_at: new Date().toISOString()
        })),
        { onConflict: 'id' }
      )
      .select();

    if (upsertError) {
      console.error('Error upserting apps:', upsertError);
      throw upsertError;
    }

    const duration = Date.now() - startTime;

    console.log(`Successfully synced ${apps.length} apps in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        synced_count: apps.length,
        duration_ms: duration,
        apps: upsertedApps
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error syncing Zapier apps:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to sync Zapier apps'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});