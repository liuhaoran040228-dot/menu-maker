/* Reviewed original bios and tips. Content-only registry. */
StarData.flavor={
  "bios": [
    {
      "id": "lan",
      "bio": "蓝发少女，鲸鱼发夹在阳光下闪烁。喜欢绘制星图，为迷路的旅人指引方向。总是带着温柔笑容，用心倾听每个故事。"
    },
    {
      "id": "mo",
      "bio": "薄荷绿发色清新如晨露，几何花发饰精致可爱。擅长归类整理，房间永远井井有条。喜欢用便签记录灵感，收藏各种小盒子。"
    },
    {
      "id": "li",
      "bio": "栗色短发配栗子发夹，笑起来眼睛弯成月牙。烘焙点心时总哼着歌，厨房里飘着甜香。有点迷糊但特别温暖。"
    },
    {
      "id": "xing",
      "bio": "紫发垂落肩头，金星发夹在夜空下熠熠生辉。痴迷星空观测，能讲述每颗星的故事。安静沉稳，偶尔会通宵追逐流星。"
    },
    {
      "id": "hu",
      "bio": "橙发活泼灵动，幻想狐耳随心情摇摆。背着小背包到处探险，收集奇特的石头和羽毛。好奇心旺盛，总能发现隐藏的小径。"
    }
  ],
  "tagline": "五位萌娘，分享一点闪光日常。",
  "runnerTip": "空中再跳一次，越过小障碍",
  "lootTip": "同款同级三合一，收集更强装备",
  "fighterTip": "连续连击，快速积攒星能"
};
StarData.characters.forEach(c=>c.bio=StarData.flavor.bios.find(b=>b.id===c.id)?.bio||c.tag);
