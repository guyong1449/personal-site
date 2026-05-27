const { Plugin, PluginSettingTab, Setting, Modal, Notice } = require("obsidian");

// Default settings
const DEFAULT_SETTINGS = {
  defaultPublish: true,
  defaultChannels: ["site"],
  defaultContentType: "note",
  autoInferTags: true,
  autoInferSummary: true,
  summaryMaxLength: 100
};

// Content type options
const CONTENT_TYPES = [
  { value: "note", label: "笔记 (Note)" },
  { value: "course", label: "课程 (Course)" },
  { value: "artwork", label: "作品 (Artwork)" }
];

// Channel options
const CHANNELS = [
  { value: "site", label: "网站 (Site)" },
  { value: "wechat", label: "微信 (WeChat)" },
  { value: "xiaohongshu", label: "小红书 (Xiaohongshu)" }
];

// Category mapping based on directory structure
const CATEGORY_MAP = {
  "01-研究项目": { area: "research", type: "reference" },
  "02-课程学习": { area: "course", type: "course" },
  "03-知识库": { area: "knowledge", type: "reference" },
  "04-方法论": { area: "method", type: "method" },
  "05-社团活动": { area: "activity", type: "activity" },
  "06-创作": { area: "creative", type: "artwork" },
  "07-归档": { area: "archive", type: "reference" },
  "08-个人": { area: "personal", type: "reference" }
};

class FrontmatterHelperPlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    // Add command to add frontmatter
    this.addCommand({
      id: "add-frontmatter",
      name: "添加 Frontmatter",
      callback: () => this.addFrontmatter()
    });

    // Add command to add frontmatter with custom settings
    this.addCommand({
      id: "add-frontmatter-custom",
      name: "添加 Frontmatter (自定义)",
      callback: () => this.addFrontmatterCustom()
    });

    // Add command to toggle publish status
    this.addCommand({
      id: "toggle-publish",
      name: "切换发布状态",
      callback: () => this.togglePublish()
    });

    // Add settings tab
    this.addSettingTab(new FrontmatterHelperSettingTab(this.app, this));

    // Add ribbon icon
    this.addRibbonIcon("file-text", "添加 Frontmatter", () => {
      this.addFrontmatter();
    });

    console.log("Frontmatter Helper plugin loaded");
  }

  onunload() {
    console.log("Frontmatter Helper plugin unloaded");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // Get current file
  getCurrentFile() {
    const activeView = this.app.workspace.getActiveViewOfType("markdown");
    if (!activeView) {
      new Notice("请先打开一个 Markdown 文件");
      return null;
    }
    return activeView.file;
  }

  // Check if file has frontmatter
  hasFrontmatter(content) {
    return content.startsWith("---\n") || content.startsWith("---\r\n");
  }

  // Remove existing frontmatter
  removeFrontmatter(content) {
    if (!this.hasFrontmatter(content)) {
      return content;
    }

    const endMarker = "\n---\n";
    const endIndex = content.indexOf(endMarker, 4);

    if (endIndex === -1) {
      return content;
    }

    return content.slice(endIndex + endMarker.length);
  }

  // Infer title from content
  inferTitle(content, filename) {
    // Try to extract title from first heading
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch) {
      return headingMatch[1].trim();
    }

    // Use filename without extension
    return filename.replace(/\.md$/, "");
  }

  // Infer content type from file path
  inferContentType(filePath) {
    for (const [dir, type] of Object.entries({
      "notes": "note",
      "courses": "course",
      "gallery": "artwork"
    })) {
      if (filePath.includes(`/${dir}/`)) {
        return type;
      }
    }

    return this.settings.defaultContentType;
  }

  // Infer tags from file path
  inferTags(filePath) {
    const tags = [];

    // Add area tag based on top-level directory
    for (const [dir, category] of Object.entries(CATEGORY_MAP)) {
      if (filePath.includes(`/${dir}/`)) {
        tags.push(`area/${category.area}`);
        tags.push(`type/${category.type}`);
        break;
      }
    }

    // Add focus tag based on subdirectory
    const parts = filePath.split("/");
    if (parts.length > 2) {
      const focus = parts[2].toLowerCase().replace(/\s+/g, "-");
      if (focus && !focus.startsWith(".")) {
        tags.push(`focus/${focus}`);
      }
    }

    return tags;
  }

  // Infer summary from content
  inferSummary(content) {
    const lines = content.split("\n");
    let inFrontmatter = false;
    let summary = "";

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip frontmatter
      if (trimmed === "---") {
        inFrontmatter = !inFrontmatter;
        continue;
      }

      if (inFrontmatter) continue;

      // Skip headings
      if (trimmed.startsWith("#")) continue;

      // Skip empty lines
      if (!trimmed) continue;

      // Use first non-empty paragraph as summary
      summary = trimmed;

      // Limit length
      if (summary.length > this.settings.summaryMaxLength) {
        summary = summary.substring(0, this.settings.summaryMaxLength - 3) + "...";
      }

      break;
    }

    return summary;
  }

  // Build frontmatter string
  buildFrontmatter(options) {
    const {
      title,
      publish,
      contentType,
      channels,
      summary,
      tags
    } = options;

    const frontmatter = {
      title,
      publish,
      content_type: contentType,
      channels,
      summary,
      tags
    };

    const lines = ["---"];

    for (const [key, value] of Object.entries(frontmatter)) {
      if (Array.isArray(value)) {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${item}`);
        }
      } else if (typeof value === "string") {
        lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    }

    lines.push("---");
    lines.push("");

    return lines.join("\n");
  }

  // Add frontmatter to current file
  async addFrontmatter() {
    const file = this.getCurrentFile();
    if (!file) return;

    const content = await this.app.vault.read(file);

    // Check if frontmatter already exists
    if (this.hasFrontmatter(content)) {
      new Notice("文件已有 frontmatter");
      return;
    }

    // Infer metadata
    const title = this.inferTitle(content, file.name);
    const contentType = this.inferContentType(file.path);
    const tags = this.settings.autoInferTags ? this.inferTags(file.path) : [];
    const summary = this.settings.autoInferSummary ? this.inferSummary(content) : "";

    // Build frontmatter
    const frontmatter = this.buildFrontmatter({
      title,
      publish: this.settings.defaultPublish,
      contentType,
      channels: this.settings.defaultChannels,
      summary,
      tags
    });

    // Add frontmatter to content
    const newContent = frontmatter + content;

    // Save file
    await this.app.vault.modify(file, newContent);

    new Notice("Frontmatter 已添加");
  }

  // Add frontmatter with custom settings
  async addFrontmatterCustom() {
    const file = this.getCurrentFile();
    if (!file) return;

    const content = await this.app.vault.read(file);

    // Check if frontmatter already exists
    if (this.hasFrontmatter(content)) {
      new Notice("文件已有 frontmatter，请使用命令: 切换发布状态");
      return;
    }

    // Open custom modal
    new FrontmatterModal(this.app, this, file, content).open();
  }

  // Toggle publish status
  async togglePublish() {
    const file = this.getCurrentFile();
    if (!file) return;

    const content = await this.app.vault.read(file);

    // Check if frontmatter exists
    if (!this.hasFrontmatter(content)) {
      new Notice("文件没有 frontmatter，请先添加");
      return;
    }

    // Find publish line
    const lines = content.split("\n");
    let publishLineIndex = -1;
    let currentPublish = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("publish:")) {
        publishLineIndex = i;
        currentPublish = line.includes("true");
        break;
      }
    }

    if (publishLineIndex === -1) {
      new Notice("frontmatter 中没有 publish 字段");
      return;
    }

    // Toggle publish status
    const newPublish = !currentPublish;
    lines[publishLineIndex] = `publish: ${newPublish}`;

    // Save file
    await this.app.vault.modify(file, lines.join("\n"));

    new Notice(`发布状态已切换为: ${newPublish ? "发布" : "不发布"}`);
  }
}

// Custom modal for frontmatter settings
class FrontmatterModal extends Modal {
  constructor(app, plugin, file, content) {
    super(app);
    this.plugin = plugin;
    this.file = file;
    this.content = content;

    // Default values
    this.title = plugin.inferTitle(content, file.name);
    this.publish = plugin.settings.defaultPublish;
    this.contentType = plugin.inferContentType(file.path);
    this.channels = [...plugin.settings.defaultChannels];
    this.summary = plugin.settings.autoInferSummary ? plugin.inferSummary(content) : "";
    this.tags = plugin.settings.autoInferTags ? plugin.inferTags(file.path) : [];
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "添加 Frontmatter" });

    // Title
    new Setting(contentEl)
      .setName("标题")
      .setDesc("文章标题")
      .addText((text) =>
        text
          .setValue(this.title)
          .onChange((value) => {
            this.title = value;
          })
      );

    // Publish
    new Setting(contentEl)
      .setName("发布")
      .setDesc("是否发布到网站")
      .addToggle((toggle) =>
        toggle
          .setValue(this.publish)
          .onChange((value) => {
            this.publish = value;
          })
      );

    // Content Type
    new Setting(contentEl)
      .setName("内容类型")
      .setDesc("选择内容类型")
      .addDropdown((dropdown) => {
        for (const type of CONTENT_TYPES) {
          dropdown.addOption(type.value, type.label);
        }
        dropdown.setValue(this.contentType);
        dropdown.onChange((value) => {
          this.contentType = value;
        });
      });

    // Channels
    const channelsSetting = new Setting(contentEl)
      .setName("发布渠道")
      .setDesc("选择发布渠道");

    for (const channel of CHANNELS) {
      const checkbox = contentEl.createEl("label");
      checkbox.style.display = "block";
      checkbox.style.marginLeft = "20px";

      const input = checkbox.createEl("input");
      input.type = "checkbox";
      input.checked = this.channels.includes(channel.value);
      input.addEventListener("change", (e) => {
        if (e.target.checked) {
          if (!this.channels.includes(channel.value)) {
            this.channels.push(channel.value);
          }
        } else {
          this.channels = this.channels.filter((c) => c !== channel.value);
        }
      });

      checkbox.createSpan({ text: ` ${channel.label}` });
    }

    // Summary
    new Setting(contentEl)
      .setName("摘要")
      .setDesc("文章摘要")
      .addText((text) =>
        text
          .setValue(this.summary)
          .onChange((value) => {
            this.summary = value;
          })
      );

    // Tags
    new Setting(contentEl)
      .setName("标签")
      .setDesc("用逗号分隔多个标签")
      .addText((text) =>
        text
          .setValue(this.tags.join(", "))
          .onChange((value) => {
            this.tags = value
              .split(",")
              .map((t) => t.trim())
              .filter((t) => t);
          })
      );

    // Buttons
    const buttonDiv = contentEl.createDiv();
    buttonDiv.style.marginTop = "20px";
    buttonDiv.style.display = "flex";
    buttonDiv.style.justifyContent = "flex-end";
    buttonDiv.style.gap = "10px";

    const cancelButton = buttonDiv.createEl("button", { text: "取消" });
    cancelButton.addEventListener("click", () => {
      this.close();
    });

    const submitButton = buttonDiv.createEl("button", { text: "添加" });
    submitButton.classList.add("mod-cta");
    submitButton.addEventListener("click", async () => {
      await this.submit();
    });
  }

  async submit() {
    // Build frontmatter
    const frontmatter = this.plugin.buildFrontmatter({
      title: this.title,
      publish: this.publish,
      contentType: this.contentType,
      channels: this.channels,
      summary: this.summary,
      tags: this.tags
    });

    // Add frontmatter to content
    const newContent = frontmatter + this.content;

    // Save file
    await this.app.vault.modify(this.file, newContent);

    new Notice("Frontmatter 已添加");
    this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Settings tab
class FrontmatterHelperSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Frontmatter Helper 设置" });

    // Default publish
    new Setting(containerEl)
      .setName("默认发布状态")
      .setDesc("新文章的默认发布状态")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.defaultPublish)
          .onChange(async (value) => {
            this.plugin.settings.defaultPublish = value;
            await this.plugin.saveSettings();
          })
      );

    // Default content type
    new Setting(containerEl)
      .setName("默认内容类型")
      .setDesc("新文章的默认内容类型")
      .addDropdown((dropdown) => {
        for (const type of CONTENT_TYPES) {
          dropdown.addOption(type.value, type.label);
        }
        dropdown.setValue(this.plugin.settings.defaultContentType);
        dropdown.onChange(async (value) => {
          this.plugin.settings.defaultContentType = value;
          await this.plugin.saveSettings();
        });
      });

    // Default channels
    const channelsSetting = new Setting(containerEl)
      .setName("默认发布渠道")
      .setDesc("新文章的默认发布渠道");

    for (const channel of CHANNELS) {
      const checkbox = containerEl.createEl("label");
      checkbox.style.display = "block";
      checkbox.style.marginLeft = "20px";

      const input = checkbox.createEl("input");
      input.type = "checkbox";
      input.checked = this.plugin.settings.defaultChannels.includes(channel.value);
      input.addEventListener("change", async (e) => {
        if (e.target.checked) {
          if (!this.plugin.settings.defaultChannels.includes(channel.value)) {
            this.plugin.settings.defaultChannels.push(channel.value);
          }
        } else {
          this.plugin.settings.defaultChannels = this.plugin.settings.defaultChannels.filter(
            (c) => c !== channel.value
          );
        }
        await this.plugin.saveSettings();
      });

      checkbox.createSpan({ text: ` ${channel.label}` });
    }

    // Auto infer tags
    new Setting(containerEl)
      .setName("自动推断标签")
      .setDesc("根据文件路径自动推断标签")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoInferTags)
          .onChange(async (value) => {
            this.plugin.settings.autoInferTags = value;
            await this.plugin.saveSettings();
          })
      );

    // Auto infer summary
    new Setting(containerEl)
      .setName("自动推断摘要")
      .setDesc("根据文件内容自动推断摘要")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoInferSummary)
          .onChange(async (value) => {
            this.plugin.settings.autoInferSummary = value;
            await this.plugin.saveSettings();
          })
      );

    // Summary max length
    new Setting(containerEl)
      .setName("摘要最大长度")
      .setDesc("自动推断摘要的最大长度")
      .addText((text) =>
        text
          .setValue(String(this.plugin.settings.summaryMaxLength))
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num > 0) {
              this.plugin.settings.summaryMaxLength = num;
              await this.plugin.saveSettings();
            }
          })
      );
  }
}

module.exports = FrontmatterHelperPlugin;
