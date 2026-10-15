/* Daily study and prayer. References only; verse text comes from the KJV data.
   The same local date always selects the same study and the prayer tied to it. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BibleDaily = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function pack(lines) {
    return lines.map(function (line) {
      const t = String(line).trim().replace(/\s+/g, ' ');
      if (!/[.!?]$/.test(t)) throw new Error('Sentence must end with punctuation: ' + t);
      if (/[.!?]/.test(t.slice(0, -1))) throw new Error('Extra sentence break: ' + t);
      return t;
    }).join(' ');
  }

  // Curated, well-known KJV verses. study: 3–5 sentences. prayer: 4–6 sentences.
  const DAYS = [
    {
      ref: 'Genesis 1:1',
      study: [
        'God made the heaven and the earth, so the world began with him and still belongs to him.',
        'Your life is part of that world, and it is not an accident or a leftover.',
        'When a day feels random, you can speak to the God who was already there at the start.',
        'Thank him for one thing you can see, and let that thanks turn into trust.'
      ],
      prayer: [
        'Father, I thank you for making the heaven and the earth, and for giving me this day.',
        'The things I cannot control are still in your hands.',
        'Give me a calm mind and a willing heart as I walk through my work and my relationships.',
        'Help me notice your care in ordinary gifts, and to treat the world as something you love.',
        'I trust you with this day, in the name of Jesus.'
      ]
    },
    {
      ref: 'Genesis 1:27',
      study: [
        'People are made in the image of God, both male and female, so every person carries his worth.',
        'That includes you, and it includes the person who is hard for you to love.',
        'You do not have to earn your value by looks, success, or the approval of others.',
        'Today, speak to someone with the respect that belongs to a person God made.'
      ],
      prayer: [
        'Lord, thank you that I am made in your image, and that the people around me are too.',
        'Forgive me when I measure myself or others by the wrong scale.',
        'Teach me to honor you by honoring the person in front of me.',
        'Heal the shame that tells me I am worth less than someone else.',
        'Let my words today protect the dignity you have given, in the name of Jesus.'
      ]
    },
    {
      ref: 'Exodus 14:14',
      study: [
        'God told his people he would fight for them, and that they could be still.',
        'Some battles are not yours to win by panic, noise, or one more frantic plan.',
        'Being still is not the same as doing nothing forever: it is refusing to take over a fight that belongs to God.',
        'Name the fear you keep rehearsing, put it in his hands, and take the next faithful step without the frenzy.'
      ],
      prayer: [
        'Lord, you see the trouble I have been trying to solve all by myself.',
        'I am tired of fighting in my own strength, and I ask you to fight for me.',
        'Quiet the thoughts that spin through the night, and give me peace while I wait.',
        'Show me what is mine to do, and what I need to leave with you.',
        'I will hold my peace and trust you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Deuteronomy 6:5',
      study: [
        'God asks for love that takes the whole heart, the whole soul, and the whole strength, not a small religious corner of life.',
        'That love shows up in ordinary choices: how you spend time, how you speak, and what you refuse to worship.',
        'You will not love him perfectly today, but you can turn toward him with the part of you that has been holding back.',
        'Give him one area you have kept for yourself, and ask him to teach you to love him there.'
      ],
      prayer: [
        'Lord, you ask me to love you with all my heart, soul, and strength.',
        'I confess that I often love my own way more than I love you.',
        'Take the part of me I have kept back, and make it yours.',
        'Let my work, my rest, and my words today be a way of loving you.',
        'I want you first, in the name of Jesus.'
      ]
    },
    {
      ref: 'Deuteronomy 31:6',
      study: [
        'God tells his people to be strong and brave because he goes with them, and he will not fail them or forsake them.',
        'Courage here is not a mood: it is trust that God stays when the threat is real.',
        'You can feel afraid and still take the next step, because his presence is the reason for the command.',
        'When fear rises today, say the truth out loud: God is with me, and he will not walk off.'
      ],
      prayer: [
        'Father, I am afraid of things I cannot manage, and I bring that fear to you.',
        'You promise to go with me and not to fail me or forsake me.',
        'Make me strong and give me a steady courage that rests on you.',
        'Stay near the people I love who are facing their own hard days.',
        'I will go forward with you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Joshua 1:9',
      study: [
        'God commands Joshua not to be afraid or dismayed, because the Lord is with him wherever he goes.',
        'The command is strong because the promise is stronger: presence, not personality, is the ground of courage.',
        'New work, a hard conversation, or an unknown future can dismay you, and God still goes there with you.',
        'Do the next right thing today without waiting until you feel fearless.'
      ],
      prayer: [
        'Lord, you told your servant not to fear, because you would be with him everywhere he went.',
        'I need that same promise in the place I am walking now.',
        'When I am dismayed, remind me that you have not stayed behind.',
        'Give me courage to obey you in the small task in front of me.',
        'I go with you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Joshua 24:15',
      study: [
        'Joshua sets a choice in front of the people: serve the Lord, or serve other gods, and then he chooses for his own house.',
        'A household does not drift into faithfulness: someone has to decide, and then live the decision on ordinary days.',
        'The gods of our age are whatever we trust, chase, and refuse to put down.',
        'Choose again today whom you will serve, and let one habit in your home show that choice.'
      ],
      prayer: [
        'Lord, I do not want a divided heart or a house pointed in two directions.',
        'I choose you today, for myself and for the people you have given me to love.',
        'Show me the smaller gods I have been serving without saying their names.',
        'Give me honesty, patience, and a steady example.',
        'As for me and my house, we will serve you, in the name of Jesus.'
      ]
    },
    {
      ref: '1 Samuel 16:7',
      study: [
        'People look at the face and the height, but the Lord looks at the heart.',
        'You can be impressed by the wrong things, and you can be crushed by the wrong things, because appearance is a poor judge.',
        'God is not fooled by image, and he is not blind to quiet faithfulness.',
        'Ask him to clean the motives under your words today, and to help you see people the way he does.'
      ],
      prayer: [
        'Lord, you look at the heart, and you see what other people miss.',
        'Forgive me for judging by appearance, and for hiding behind an image of my own.',
        'Make my heart true when no one is clapping.',
        'Help me encourage the person who is overlooked.',
        'I want to live honestly before you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Nehemiah 8:10',
      study: [
        'The joy of the Lord is called strength, on a holy day when the people were told not to grieve.',
        'This joy is not pretending that pain is fake: it is strength that comes from who God is.',
        'You can eat, share, and keep going because God himself is your gladness, not because every problem has vanished.',
        'Share something good with someone who has little today, and let gratitude be part of your strength.'
      ],
      prayer: [
        'Lord, my strength runs out when I carry the day alone.',
        'Be my joy, and let that joy hold me up when sorrow is close.',
        'Keep me from pretending, and also from sinking into despair.',
        'Show me someone who needs a share of what you have given me.',
        'I receive your joy as my strength, in the name of Jesus.'
      ]
    },
    {
      ref: 'Psalms 23:1',
      study: [
        'The Lord is a shepherd, and the one who belongs to him shall not want.',
        'A shepherd leads, feeds, guards, and stays, so this is personal care and not a distant idea.',
        'Not wanting does not mean you get every wish: it means you will not lack what the shepherd knows you need.',
        'When you feel short on peace, time, or hope, say who your shepherd is before you list what you lack.'
      ],
      prayer: [
        'Lord, you are my shepherd, and I belong to you.',
        'I bring you the places where I feel empty and afraid of not having enough.',
        'Lead me today, and give me what I truly need.',
        'Keep me from chasing other shepherds who cannot care for my soul.',
        'I will follow you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Psalms 23:4',
      study: [
        'The valley of the shadow of death is a real path, and the promise is not that you will skip it.',
        'Fear loses its grip because God is with you there, and his rod and staff are a comfort, not a threat.',
        'Grief, illness, and danger can cast a long shadow, and the shepherd still walks in it with his own.',
        'You do not have to be brave alone: tell him you are in the valley, and let his presence be your comfort.'
      ],
      prayer: [
        'Father, some of this road feels like a valley, and the shadow is long.',
        'Stay with me, because I do not want to walk it by myself.',
        'Let your care comfort me more than the fear can shake me.',
        'Be near anyone I love who is grieving or afraid tonight.',
        'I will fear no evil, because you are with me, in the name of Jesus.'
      ]
    },
    {
      ref: 'Psalms 27:1',
      study: [
        'The Lord is light, salvation, and the strength of life, so the question is honest: whom shall I fear?',
        'Fear shrinks when you look at who God is instead of staring only at what might go wrong.',
        'Light is for the next step, salvation is for the whole danger, and strength is for the day you still have to live.',
        'When anxiety names a threat, answer it with this verse before you answer it with a plan.'
      ],
      prayer: [
        'Lord, you are my light and my salvation, and the strength of my life.',
        'I have been afraid of people, of failure, and of what I cannot see.',
        'Shine on the step I need to take, and save me from the fear that freezes me.',
        'Be the strength of anyone who wakes up dreading the day.',
        'Of whom shall I be afraid, if you are with me, in the name of Jesus.'
      ]
    },
    {
      ref: 'Psalms 34:8',
      study: [
        'The psalm invites you to taste and see that the Lord is good, and it calls the person who trusts him blessed.',
        'God is not known only by argument: his goodness is something you find by trusting him in real life.',
        'Taste means you come close enough to obey, pray, and wait, instead of judging him from a distance.',
        'Trust him with one concrete worry today, and watch for his goodness with an honest heart.'
      ],
      prayer: [
        'Lord, I want to taste and see that you are good, not only to say the words.',
        'I trust you with a need I have been carrying alone.',
        'Show me your kindness in a way my heart can recognize.',
        'Bless the person who is afraid to trust you, and draw them near.',
        'I come close today, in the name of Jesus.'
      ]
    },
    {
      ref: 'Psalms 37:4',
      study: [
        'Delight in the Lord comes before the promise about the desires of the heart.',
        'The verse is not a way to use God to get a wish list: delight changes what the heart wants.',
        'When God is your joy, your desires are slowly shaped by his goodness.',
        'Spend a few quiet minutes enjoying who he is today, before you ask him for anything.'
      ],
      prayer: [
        'Father, teach me to delight in you, and not only in what you can give me.',
        'Shape the desires of my heart until they fit your goodness.',
        'I lay my wishes in front of you, and I ask you to keep what is right and heal what is selfish.',
        'Give me joy in you when the answer is slow.',
        'I want you more than the gift, in the name of Jesus.'
      ]
    },
    {
      ref: 'Psalms 46:1',
      study: [
        'God is a refuge, a strength, and a help who is very present when there is trouble.',
        'A refuge is a place you run to, not a slogan you repeat after the danger has passed.',
        'He does not show up late to the crisis: the verse says he is very present in it.',
        'When trouble hits today, turn to him first instead of exhausting every other shelter.'
      ],
      prayer: [
        'God, you are my refuge and my strength, and a very present help in trouble.',
        'I run to you with the problem that is too close and too big for me.',
        'Be present in the room, in the decision, and in the fear.',
        'Protect the people who have nowhere safe to stand.',
        'I hide in you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Psalms 46:10',
      study: [
        'Be still, and know that I am God, is a command to stop striving and recognize who is actually God.',
        'Stillness here is trust: you lay down the need to manage every outcome.',
        'God will be exalted, so the day does not depend on your panic to hold it together.',
        'Set the phone down, breathe, and say his name until your mind catches up with the truth.'
      ],
      prayer: [
        'Lord, I am noisy inside, and I keep trying to be the one in charge.',
        'Teach me to be still and to know that you are God.',
        'I let go of outcomes I cannot force.',
        'Be exalted in my home, my work, and the places that feel out of control.',
        'I quiet myself before you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Psalms 51:10',
      study: [
        'This is a prayer for a clean heart and a right spirit, not a promise that you can renovate yourself.',
        'God creates cleanness: the word is the same kind of making that only he can do.',
        'Guilt can either drive you into hiding or into an honest prayer, and this verse chooses honesty.',
        'Ask him today for a clean heart in the specific place where you know you have bent the truth.'
      ],
      prayer: [
        'O God, create in me a clean heart, and renew a right spirit within me.',
        'I am sorry for the thought, the word, and the habit that have stained this day.',
        'I cannot wash myself, so I ask you to make me clean.',
        'Give me a spirit that wants what is right even when no one sees.',
        'Keep me near you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Psalms 55:22',
      study: [
        'You are told to cast your burden on the Lord, and he will sustain you.',
        'Casting is an action: you move the weight from your own back onto God, instead of describing it forever.',
        'He does not promise that the righteous will never feel pressure: he promises they will not be moved off their feet.',
        'Name the burden in prayer today, and refuse to pick it back up every hour as if he never took it.'
      ],
      prayer: [
        'Lord, I cast this burden on you, because I cannot carry it well.',
        'Sustain me in my body, my mind, and my responsibilities.',
        'Keep me from being moved by fear or by the need to control everything.',
        'Hold up the people whose loads are heavier than anyone around them knows.',
        'I leave this with you and I trust you to sustain me, in the name of Jesus.'
      ]
    },
    {
      ref: 'Psalms 91:1',
      study: [
        'The person who dwells in the secret place of the Most High abides under the shadow of the Almighty.',
        'Dwelling means staying, not paying a short visit when you are desperate.',
        'The shadow is close: you are near enough to God that his presence covers you.',
        'Make a simple daily place and time to be with him, and treat it as home rather than an errand.'
      ],
      prayer: [
        'Most High God, I want to dwell with you and not only visit when I am in trouble.',
        'Cover me with your presence today.',
        'Teach me to stay near you in ordinary hours, not only in emergencies.',
        'Be a shelter for people who feel exposed and alone.',
        'I abide with you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Psalms 100:5',
      study: [
        'The Lord is good, his mercy lasts, and his truth goes on through every generation.',
        'Goodness, mercy, and truth are not moods he sometimes has: they are who he is.',
        'You can hand this same God to the people who come after you, because he does not expire.',
        'Tell someone younger, or someone newer to faith, one true thing about his goodness today.'
      ],
      prayer: [
        'Lord, you are good, your mercy is everlasting, and your truth endures.',
        'Thank you for mercy that outlasts my failure.',
        'Anchor me in what is true when my feelings swing.',
        'Let the next generation hear that you are good, starting with the way I live today.',
        'I praise you for mercy that does not run out, in the name of Jesus.'
      ]
    },
    {
      ref: 'Psalms 118:24',
      study: [
        'This is the day the Lord has made, and the right answer is to rejoice and be glad in it.',
        'The day in front of you was not assembled by accident, even if parts of it are hard.',
        'Rejoicing is a choice to receive the day from God before you grade it.',
        'Before you open the list of tasks, thank him that you woke up inside a day he made.'
      ],
      prayer: [
        'Lord, this is the day you have made, and I choose to rejoice in it.',
        'I do not know all it holds, but I know it comes from you.',
        'Give me gladness that is honest, not a smile pasted over pain.',
        'Help me meet the people in this day with patience and thanks.',
        'I receive today from your hand, in the name of Jesus.'
      ]
    },
    {
      ref: 'Psalms 119:105',
      study: [
        'God\'s word is a lamp for the feet and a light for the path, which is enough light for the next step.',
        'A lamp does not show the whole year: it shows where to put your foot now.',
        'Scripture guides you when feelings, habits, and other voices pull in different directions.',
        'Read a few verses slowly today, and ask what one step they light up.'
      ],
      prayer: [
        'Lord, your word is a lamp to my feet and a light to my path.',
        'I do not need a map of the whole future as much as I need the next faithful step.',
        'Shine on my choices, my words, and the temptation I keep meeting.',
        'Give light to anyone who feels lost and does not know where to turn.',
        'I will walk by what you have said, in the name of Jesus.'
      ]
    },
    {
      ref: 'Psalms 121:2',
      study: [
        'Help comes from the Lord, the one who made heaven and earth, not from the hills or from a smaller power.',
        'The maker of everything is not short of strength for your actual problem.',
        'Looking to people and plans can be wise, but they are not the source.',
        'Ask him for help before you spiral, and then use the ordinary means he gives without forgetting who sent them.'
      ],
      prayer: [
        'Lord, my help comes from you, the maker of heaven and earth.',
        'I have looked in too many other places first.',
        'Help me today with the need I can name and the one I cannot.',
        'Be the helper of people who have run out of options.',
        'I lift my eyes to you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Psalms 139:14',
      study: [
        'You are fearfully and wonderfully made, and the fitting answer is praise, not self-hatred.',
        'God\'s works are marvelous, and that includes the body and the life you sometimes wish were different.',
        'This verse does not deny pain or disability: it denies the lie that you are a mistake.',
        'Thank him for one part of how he made you, and treat your body with care today.'
      ],
      prayer: [
        'Father, I praise you because I am fearfully and wonderfully made.',
        'Forgive me for speaking about myself with contempt.',
        'Teach me to see your work in my life with gratitude.',
        'Comfort the person who feels misshapen or unwanted.',
        'My soul knows that your works are marvelous, and I thank you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Proverbs 3:5',
      study: [
        'Trust in the Lord with all your heart, and do not lean on your own understanding.',
        'Your understanding is a gift, but it is a bad place to put the full weight of your life.',
        'Wholehearted trust does not mean you stop thinking: it means God gets the final say when you and he disagree.',
        'Where you are leaning on your own reading of the future, hand that weight back to him today.'
      ],
      prayer: [
        'Lord, I want to trust you with all my heart.',
        'I confess how quickly I lean on my own understanding.',
        'Where I am sure I see the whole picture, humble me.',
        'Give wisdom to the decision in front of me, and peace if I must wait.',
        'I trust you more than I trust my own reading of things, in the name of Jesus.'
      ]
    },
    {
      ref: 'Proverbs 3:6',
      study: [
        'In all your ways acknowledge God, and he will direct your paths.',
        'All your ways means work, money, rest, friendship, and the small choices, not only religious moments.',
        'To acknowledge him is to bring him into the decision before you lock it in.',
        'Pause before the next choice today and ask what would honor him, then walk that way.'
      ],
      prayer: [
        'Lord, I acknowledge you in the ways of this day, not only in a morning prayer.',
        'Direct my paths in work, in conversation, and in the plans I am tempted to force.',
        'Keep me from treating you like a backup when my own route fails.',
        'Guide the people who are standing at a crossroad and need a clear step.',
        'I will look to you as I go, in the name of Jesus.'
      ]
    },
    {
      ref: 'Proverbs 4:23',
      study: [
        'Guard your heart with all diligence, because the issues of life flow out of it.',
        'What you feed, replay, and desire will eventually come out in words and choices.',
        'Diligence means you notice what is getting in, instead of acting surprised by what comes out.',
        'Close one gate today: a grudge, a fantasy, or a voice that is making you smaller and harder.'
      ],
      prayer: [
        'Lord, the issues of my life flow from my heart, so I ask you to guard it with me.',
        'Show me what I have been letting in that does not belong.',
        'Clean the resentments and the cravings I have nursed.',
        'Let what flows out of me today be patient, true, and kind.',
        'I give you my heart again, in the name of Jesus.'
      ]
    },
    {
      ref: 'Proverbs 16:3',
      study: [
        'Commit your works to the Lord, and your thoughts will be established.',
        'Handing the work to God steadies the mind that keeps spinning through every possible outcome.',
        'Commitment is more than a quick prayer after you have already decided: it is doing the work as his.',
        'Before you start the main task today, commit it to him and then give it an honest effort.'
      ],
      prayer: [
        'Lord, I commit my work to you, the seen tasks and the hidden ones.',
        'Establish my thoughts so I am not jerked around by worry.',
        'Let me work faithfully without needing every result to flatter me.',
        'Bless the labor of people who are weary and unsure if it matters.',
        'This day\'s work is yours, in the name of Jesus.'
      ]
    },
    {
      ref: 'Proverbs 18:10',
      study: [
        'The name of the Lord is a strong tower, and the righteous run into it and are safe.',
        'Safety is not found by standing in the open and hoping: you run to God.',
        'His name means his character, the God who actually is, not a word you use as a charm.',
        'When you feel exposed today, pray on purpose and let that be you running into the tower.'
      ],
      prayer: [
        'Lord, your name is a strong tower, and I run to you.',
        'I have tried to feel safe by controlling people and plans.',
        'Be my safety in the criticism, the news, and the fear I carry.',
        'Give refuge to anyone who is not safe at home or in their own thoughts.',
        'I hide in you and I am grateful, in the name of Jesus.'
      ]
    },
    {
      ref: 'Isaiah 9:6',
      study: [
        'A child is born and a son is given, and he carries the names Wonderful, Counsellor, mighty God, everlasting Father, and Prince of Peace.',
        'Christmas hope is not only a story about a baby: it is God giving a Son who can actually govern and actually bring peace.',
        'You need a counsellor who is wise, a God who is mighty, a Father who does not expire, and a peace that is a person.',
        'Bring him the conflict you cannot settle, and ask the Prince of Peace to rule that place in you.'
      ],
      prayer: [
        'Father, thank you for the child who was born and the Son who was given.',
        'Jesus, be my counsellor where I am confused, and my peace where I am at war inside.',
        'I need a mighty God and an everlasting Father, and I find them in you.',
        'Rule the quarrel, the fear, and the future I keep trying to govern myself.',
        'I welcome you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Isaiah 26:3',
      study: [
        'God keeps in perfect peace the person whose mind is stayed on him, because that person trusts him.',
        'Peace is tied to where you let your mind rest, not to a life with no problems.',
        'A stayed mind comes back to God when it wanders, again and again, on purpose.',
        'Each time your thoughts bolt today, return them to him with a short prayer instead of following them all the way down.'
      ],
      prayer: [
        'Lord, keep me in perfect peace, because my mind is so quick to leave you.',
        'I set my thoughts on you again, and I ask you to hold them there.',
        'I trust you with the scenario I have been rehearsing.',
        'Give peace to anxious minds in homes I know and love.',
        'My mind is stayed on you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Isaiah 40:31',
      study: [
        'Those who wait on the Lord renew their strength: they rise, they run without wearing out, and they walk without fainting.',
        'Waiting on God is hopeful attention, not killing time or quitting.',
        'Some days you need wings, some days you need a run, and some days you only need to keep walking without fainting.',
        'If you are tired, wait on him before you quit, and ask for strength for the kind of day this actually is.'
      ],
      prayer: [
        'Lord, I am weary, and my own strength is thin.',
        'I wait on you, and I ask you to renew me.',
        'Give me wings if I must rise, and a steady walk if that is all I can do.',
        'Keep me from fainting in a responsibility you have given me.',
        'I look to you for strength, in the name of Jesus.'
      ]
    },
    {
      ref: 'Isaiah 41:10',
      study: [
        'God says not to fear and not to be dismayed, because he is with you and he is your God.',
        'He does not stop at comfort: he will strengthen, help, and uphold you with his righteous right hand.',
        'Upholding is personal: you are not told to grip harder, but that he holds you.',
        'When dismay hits, answer it with his words: you are with me, you are my God, you will help me.'
      ],
      prayer: [
        'Lord, you tell me not to fear, because you are with me and you are my God.',
        'I am dismayed, and I ask you to strengthen me and help me.',
        'Uphold me with your righteous hand when my own grip fails.',
        'Be the help of someone who feels dropped and alone today.',
        'I will not face this without you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Isaiah 53:5',
      study: [
        'The servant was wounded for our transgressions and bruised for our iniquities, and the punishment that brings us peace was laid on him.',
        'This is Jesus bearing sin so that guilty people can be brought back to God.',
        'The healing in this verse is the deep healing of peace with God, which then reaches the rest of a broken life.',
        'Bring him the wrong you have done and the hurt you carry, and receive forgiveness instead of trying to pay for it yourself.'
      ],
      prayer: [
        'Lord Jesus, you were wounded for my transgressions and bruised for my iniquities.',
        'I do not want to treat your suffering lightly, or to keep paying for sins you already carried.',
        'Give me peace with God, and heal what guilt and hurt have twisted in me.',
        'Teach me to forgive because I have been forgiven.',
        'I trust your cross, in the name of Jesus.'
      ]
    },
    {
      ref: 'Jeremiah 29:11',
      study: [
        'God spoke these words to people in exile, and he promised thoughts of peace and a future, not a quick escape from the hard years.',
        'The verse is not a guarantee that every plan you prefer will succeed.',
        'It is a reason to trust that God\'s purposes are good, and that he is not plotting against the people he loves.',
        'Pray about your future, work faithfully in the present, and refuse both panic and the idea that you must control the ending.'
      ],
      prayer: [
        'Father, you know the thoughts you think toward your people, thoughts of peace and not of evil.',
        'I confess my fear about the future, and my habit of writing an ending you have not written.',
        'Give me hope that is patient, and work for me to do while I wait.',
        'Hold the future of the people I love who cannot see a way forward.',
        'I trust your good purpose, in the name of Jesus.'
      ]
    },
    {
      ref: 'Micah 6:8',
      study: [
        'God has shown what is good: do justly, love mercy, and walk humbly with your God.',
        'Justice without mercy grows harsh, mercy without justice grows sentimental, and both without humility become a performance.',
        'This is ordinary faithfulness: fair dealing, a love of kindness, and a walk that stays low and close to God.',
        'Pick one relationship today and ask which of the three is missing, then practice that one.'
      ],
      prayer: [
        'Lord, you have shown me what is good, and I ask for grace to live it.',
        'Help me do justly when it would be easier to look away.',
        'Teach me to love mercy when I would rather win.',
        'Keep me humble as I walk with you through this ordinary day.',
        'Let my life match what you have required, in the name of Jesus.'
      ]
    },
    {
      ref: 'Nahum 1:7',
      study: [
        'The Lord is good, a stronghold in the day of trouble, and he knows the people who trust him.',
        'Goodness and strength belong together: he is safe to run to, and strong enough to matter.',
        'He knows you, so trust is not anonymous and trouble is not unseen.',
        'If this is a day of trouble, go to him as a stronghold and tell him you trust him, simply and out loud.'
      ],
      prayer: [
        'Lord, you are good, and you are a stronghold in the day of trouble.',
        'You know me, and you know the people who are trusting you with very little left.',
        'I run to you with the trouble of this day.',
        'Be a shelter, and do not let me trust in anything smaller than you.',
        'I am grateful that you know me, in the name of Jesus.'
      ]
    },
    {
      ref: 'Zephaniah 3:17',
      study: [
        'The Lord your God is in the midst of you, mighty to save, and he rejoices over you with joy and singing.',
        'God is not only a judge at a distance: he is near, and his heart toward his people is glad.',
        'You may be used to disappointing yourself, and still be someone God rejoices over.',
        'Let that change the way you pray today: come near, and receive love instead of only listing failures.'
      ],
      prayer: [
        'Lord, you are in the midst of your people, mighty to save, and you rejoice over them.',
        'I have a hard time believing you sing over someone like me.',
        'Quiet my shame, and let me rest in your love.',
        'Save what is breaking in me and around me.',
        'I receive your joy, in the name of Jesus.'
      ]
    },
    {
      ref: 'Matthew 5:16',
      study: [
        'Jesus tells his people to let their light shine so that others see good works and glorify the Father in heaven.',
        'The aim of a visible life is not applause for you: it is glory for God.',
        'Good works are practical, the kind of thing a neighbor can actually see.',
        'Do one quiet good thing today that makes God look trustworthy to somebody else.'
      ],
      prayer: [
        'Father in heaven, let my light shine in a way that points to you.',
        'Save me from good works that are really a bid for praise.',
        'Show me a concrete kindness I can do today.',
        'Make the ordinary goodness of your people a reason for others to honor you.',
        'I want my life to glorify you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Matthew 6:33',
      study: [
        'Jesus says to seek first the kingdom of God and his righteousness, and the needed things will be added.',
        'First means the kingdom outranks worry about food, clothes, status, and the next bill.',
        'Seeking his righteousness means you want to live his way, not only to secure your comfort.',
        'Put one kingdom concern ahead of one anxiety today: pray, make peace, or tell the truth before you chase the worry.'
      ],
      prayer: [
        'Father, I have been seeking many things before I seek your kingdom.',
        'Teach me to want your rule and your righteousness first.',
        'Add what I truly need, and free me from the fear that I must grab it.',
        'Provide for people who do not know where the next meal is coming from.',
        'Your kingdom come in my ordinary choices, in the name of Jesus.'
      ]
    },
    {
      ref: 'Matthew 11:28',
      study: [
        'Jesus calls the people who labor and are heavy laden to come to him, and he will give them rest.',
        'The invitation is for the tired, not for the people who have already fixed themselves.',
        'Rest is a person you come to, not only a weekend you hope will be empty.',
        'Come to him today with the specific load, and stop trying to earn the right to be tired in his presence.'
      ],
      prayer: [
        'Lord Jesus, I am tired, and I am carrying more than I can hold.',
        'You told the heavy laden to come, so I come.',
        'Give me the rest that is found in you, not only a break from tasks.',
        'Lift the weight of guilt, hurry, and the fear of letting people down.',
        'I will stay near you today, in the name of Jesus.'
      ]
    },
    {
      ref: 'Matthew 22:37',
      study: [
        'Jesus names the great commandment: love the Lord your God with all your heart, soul, and mind.',
        'Love is not only a feeling in the heart: it includes the mind, the thoughts you agree with and the attention you spend.',
        'All means you do not keep a locked room where God is not welcome.',
        'Offer him your thoughts today, especially the loop you have not wanted him to enter.'
      ],
      prayer: [
        'Lord, I want to love you with all my heart, all my soul, and all my mind.',
        'My love is divided, and my thoughts wander into rooms I do not invite you into.',
        'Take the whole of me, including the part I hide.',
        'Let love for you change how I treat the person closest to me.',
        'I love you because you first loved me, in the name of Jesus.'
      ]
    },
    {
      ref: 'Luke 6:31',
      study: [
        'Treat people the way you would want them to treat you.',
        'Jesus makes this the measure of ordinary dealings, not a special mood for religious days.',
        'It asks you to imagine yourself on the other side of your tone, your hurry, and your silence.',
        'Before you speak or decide today, pause and ask how you would hope to be treated if the roles were reversed.'
      ],
      prayer: [
        'Lord, teach me to do to others what I would want done to me.',
        'I am quick to want patience and slow to give it.',
        'Put me in the other person\'s place before I judge, interrupt, or ignore them.',
        'Let my home and my work feel the difference.',
        'Make me gentle and fair, in the name of Jesus.'
      ]
    },
    {
      ref: 'John 1:1',
      study: [
        'In the beginning the Word already was, the Word was with God, and the Word was God.',
        'Jesus is not a later idea God tried: he is the eternal Word, close to the Father, and truly God.',
        'The one who speaks the world into being is the one who later speaks peace to frightened people.',
        'Trust his words today as the words of God, and let them outweigh the louder voices.'
      ],
      prayer: [
        'Lord Jesus, you are the Word who was with God and who is God.',
        'I worship you, and I do not want a smaller version of you.',
        'Speak into the beginning of this day, and into the chaos I cannot sort.',
        'Let your word be louder than my fear.',
        'I trust you, in the name of Jesus.'
      ]
    },
    {
      ref: 'John 3:16',
      study: [
        'God loved the world so much that he gave his only Son, so that whoever believes in him will not perish but have everlasting life.',
        'The love is God\'s, the gift is his Son, and the way in is faith, not a performance good enough to deserve it.',
        'Whoever is a wide word: it includes the person who feels too far gone, and it includes you.',
        'Believe him today by thanking him for the gift, and by telling the truth to him instead of hiding.'
      ],
      prayer: [
        'Father, thank you for loving the world, and for loving me, enough to give your Son.',
        'I believe in Jesus, and I receive everlasting life as your gift.',
        'Keep me from treating this love as small or as something I must repay before I can rest in it.',
        'Draw someone I know who does not yet believe.',
        'I trust your Son, in the name of Jesus.'
      ]
    },
    {
      ref: 'John 8:12',
      study: [
        'Jesus says he is the light of the world, and the person who follows him will not walk in darkness but will have the light of life.',
        'Following is how you stay in the light: it is a walk behind him, not a glance in his direction.',
        'Darkness is real, in confusion, sin, and grief, and he does not tell you to make your own light.',
        'Follow him in the next choice today, especially where you have been walking by a light he did not give.'
      ],
      prayer: [
        'Lord Jesus, you are the light of the world, and I do not want to walk in darkness.',
        'Show me where I have been following something else.',
        'Give me the light of life for the decision and the mood of this day.',
        'Shine for people who cannot see a way through.',
        'I will follow you, in the name of Jesus.'
      ]
    },
    {
      ref: 'John 14:6',
      study: [
        'Jesus says he is the way, the truth, and the life, and that no one comes to the Father except through him.',
        'He does not point to a path and stay behind: he is the way you walk.',
        'Truth and life are not separate subjects from him, so you do not get the Father by a route that leaves Jesus out.',
        'Come to the Father through him today, in prayer, without inventing a different road.'
      ],
      prayer: [
        'Lord Jesus, you are the way, the truth, and the life.',
        'I come to the Father through you, and not by my own goodness.',
        'Where I am lost, be the way: where I am confused, be the truth: where I am empty, be the life.',
        'Keep me from looking for a savior in success, people, or myself.',
        'I come through you, in the name of Jesus.'
      ]
    },
    {
      ref: 'John 14:27',
      study: [
        'Jesus leaves his own peace, and he says it is not the kind the world gives.',
        'The world\'s peace depends on things going well: his peace can sit in a troubled heart.',
        'He tells you not to let your heart be troubled or afraid, and he gives the peace that makes that possible.',
        'When your chest is tight today, ask for his peace by name, and stop feeding the fear one more imagined scene.'
      ],
      prayer: [
        'Lord Jesus, you give a peace the world cannot give, and I need it.',
        'My heart is troubled, and I ask you to settle it.',
        'I refuse to keep feeding the fear that has been running my thoughts.',
        'Leave your peace with the people in my life who cannot sleep for worry.',
        'I receive your peace, in the name of Jesus.'
      ]
    },
    {
      ref: 'John 15:5',
      study: [
        'Jesus is the vine and his people are branches: if you abide in him, you bear fruit, and apart from him you can do nothing.',
        'Fruit is the result of connection, not of straining to look productive.',
        'Abiding means you stay: prayer, trust, and obedience are how a branch remains on the vine.',
        'Before you try to produce a result today, stay with him, and do the work as someone who is attached to him.'
      ],
      prayer: [
        'Lord Jesus, you are the vine and I am a branch, and apart from you I can do nothing.',
        'I have tried to bear fruit by effort alone, and I am dry.',
        'Keep me abiding in you through this day.',
        'Let the fruit be real: love, patience, and a life that looks like yours.',
        'I stay with you, in the name of Jesus.'
      ]
    },
    {
      ref: 'John 16:33',
      study: [
        'Jesus speaks so that in him you may have peace, and he is honest that in the world you will have tribulation.',
        'Faith does not deny trouble: it hears him say to be of good cheer because he has overcome the world.',
        'The cheer is not denial: it is courage that stands on his victory.',
        'Name the tribulation without drama, and then put his overcome next to it before you decide the story is finished.'
      ],
      prayer: [
        'Lord Jesus, you promised peace in you, and you told the truth about trouble in the world.',
        'I bring you the tribulation I would rather skip.',
        'Teach me to be of good cheer because you have overcome, not because I can see the ending.',
        'Give courage to people who are in the middle of a hard chapter.',
        'I take heart in you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Romans 5:8',
      study: [
        'God shows his love in this: while we were still sinners, Christ died for us.',
        'The love is not a reward for people who had already cleaned up.',
        'You do not have to arrive at a better version of yourself before you are loved.',
        'Receive that love today, and let it make you patient with someone who is still in the middle of their own mess.'
      ],
      prayer: [
        'Father, thank you for showing your love by Christ dying for me while I was still a sinner.',
        'I stop trying to make myself presentable before I come to you.',
        'Let this love soften the way I see people who are still far off.',
        'Keep the cross at the center of my day, not only my emergencies.',
        'I receive your love, in the name of Jesus.'
      ]
    },
    {
      ref: 'Romans 6:23',
      study: [
        'The wages of sin is death, but the gift of God is eternal life through Jesus Christ our Lord.',
        'Wages are earned, and a gift is received, and the verse sets those two paths side by side.',
        'Sin pays a real wage, so this is not a small warning, and life is a real gift, so this is not a small hope.',
        'Do not try to earn today what God gives in Jesus: thank him, and turn from the sin whose wage you do not want.'
      ],
      prayer: [
        'Lord, I do not want the wage of sin, and I cannot earn the life you give.',
        'Thank you for the gift of eternal life through Jesus Christ.',
        'Turn me from the habit that keeps promising pleasure and paying in death.',
        'Help me offer this gift to someone else with honesty and kindness.',
        'I receive your gift, in the name of Jesus.'
      ]
    },
    {
      ref: 'Romans 8:1',
      study: [
        'There is now no condemnation for those who are in Christ Jesus and walk after the Spirit rather than after the flesh.',
        'Condemnation is the verdict you keep handing yourself, and the verse says God is not handing it to you in Christ.',
        'Walking after the Spirit is the direction of a forgiven life, not the entrance fee.',
        'If shame is louder than the gospel today, answer it with this sentence: there is now no condemnation in Christ.'
      ],
      prayer: [
        'Father, thank you that there is now no condemnation for me in Christ Jesus.',
        'Silence the voice that keeps reopening a case you have closed.',
        'Teach me to walk after the Spirit in the choice in front of me.',
        'Free someone I love who lives under a verdict you have not spoken.',
        'I stand in your grace, in the name of Jesus.'
      ]
    },
    {
      ref: 'Romans 8:28',
      study: [
        'God works all things together for good for those who love him and are called according to his purpose.',
        'All things includes events you would never choose, and good is his purpose, not a promise that every chapter will feel pleasant.',
        'You may not see the weaving while you are still in the thread.',
        'Love him in the unwanted thing today by trusting his purpose instead of declaring the story ruined.'
      ],
      prayer: [
        'Father, I believe you work all things together for good for those who love you.',
        'I do not understand this chapter, and I bring you my confusion without pretending.',
        'Hold your purpose when I cannot see it.',
        'Comfort people who are in a story they did not ask for.',
        'I love you and I trust your weaving, in the name of Jesus.'
      ]
    },
    {
      ref: 'Romans 8:39',
      study: [
        'Nothing in the heights or the depths, and no other creature, can separate you from the love of God in Christ Jesus.',
        'The list in this chapter is meant to be exhaustive: there is no place and no power that wins against that love.',
        'You can feel far from God and still not be separated from his love.',
        'When you feel the distance today, answer the feeling with the fact, and come back to him instead of waiting to feel worthy.'
      ],
      prayer: [
        'Father, nothing can separate me from your love in Christ Jesus.',
        'Not the height of a good day, and not the depth I am afraid of.',
        'When I feel far away, pull me back by the truth of this love.',
        'Hold the person who thinks they have finally outrun you.',
        'I rest in a love that will not let go, in the name of Jesus.'
      ]
    },
    {
      ref: 'Romans 10:9',
      study: [
        'If you confess with your mouth that Jesus is Lord, and believe in your heart that God raised him from the dead, you will be saved.',
        'Salvation here is both inward trust and an open confession: the heart believes, and the mouth says so.',
        'The resurrection is the heart of the belief, because a dead savior cannot save.',
        'Say today, even in a quiet room, that Jesus is Lord, and thank God that he raised him.'
      ],
      prayer: [
        'Father, I confess with my mouth that Jesus is Lord.',
        'I believe in my heart that you raised him from the dead.',
        'Save me, and keep me, and do not let this confession stay only in private.',
        'Give me a simple courage to say his name when it would be easier to stay vague.',
        'I trust the risen Lord, in the name of Jesus.'
      ]
    },
    {
      ref: 'Romans 12:2',
      study: [
        'Do not be conformed to this world, but be transformed by the renewing of your mind, so you can recognize God\'s will.',
        'The world presses you into its shape through what you admire, fear, and repeat.',
        'A renewed mind is not a trick of positive thinking: it is God changing how you see, often through Scripture and obedience.',
        'Notice one place you are being squeezed into the world\'s mold today, and choose the other shape on purpose.'
      ],
      prayer: [
        'Lord, I do not want to be conformed to this world.',
        'Renew my mind so I can tell what is good, acceptable, and perfect in your will.',
        'Show me the pressure I have started to call normal.',
        'Transform my reactions, not only my opinions.',
        'Make me new from the inside, in the name of Jesus.'
      ]
    },
    {
      ref: '1 Corinthians 10:13',
      study: [
        'The temptation you face is common to human beings, and God is faithful.',
        'He will not let you be tempted beyond what you are able, and he makes a way to endure it.',
        'You are not a rare case, and you are not abandoned in the moment that feels irresistible.',
        'Look for the way out today: leave the room, tell someone, or pray before the next step of the old pattern.'
      ],
      prayer: [
        'Faithful God, you know the temptation that feels bigger than I am.',
        'Thank you that it is common, and that I am not the only one who struggles here.',
        'Show me the way of escape, and give me the sense to take it.',
        'Do not let me call rebellion a necessity.',
        'I want to bear this faithfully, in the name of Jesus.'
      ]
    },
    {
      ref: '1 Corinthians 13:13',
      study: [
        'Faith, hope, and charity remain, and the greatest of these is charity, the love that seeks the good of the other.',
        'Gifts and knowledge can impress, and still miss the thing that matters most.',
        'Love is greatest because it looks like God and because it outlasts the things we use to rank each other.',
        'Let love win one interaction today where you would rather be right, impressive, or left alone.'
      ],
      prayer: [
        'Lord, faith, hope, and love are meant to remain in me, and the greatest is love.',
        'Forgive me for admiring gifts more than I practice charity.',
        'Make my love patient in the conversation I am tempted to win.',
        'Grow this love in your people until it is the thing others can recognize.',
        'I want the greatest thing, in the name of Jesus.'
      ]
    },
    {
      ref: '2 Corinthians 5:17',
      study: [
        'If anyone is in Christ, that person is a new creature: old things have passed, and new things have come.',
        'New does not mean you have no memory and no struggle: it means you are not defined by the old life anymore.',
        'Being in Christ is the location of the newness, so identity comes from union with him.',
        'When an old label shouts today, answer it with who you are in Christ, and take one new step that fits.'
      ],
      prayer: [
        'Father, thank you that in Christ I am a new creature.',
        'The old things still knock, and I ask you to remind me that they do not name me.',
        'Let the new life show up in a concrete choice today.',
        'Give hope to someone who thinks their past is the last word.',
        'I belong to Christ, in the name of Jesus.'
      ]
    },
    {
      ref: '2 Corinthians 12:9',
      study: [
        'Jesus tells Paul that his grace is sufficient, and that his strength is made perfect in weakness.',
        'The verse does not glamorize pain: it says weakness is where Christ\'s power is glad to rest.',
        'You can stop pretending you are adequate, and still be useful, because grace is the adequacy.',
        'Admit one weakness to God today without shame theater, and ask his grace to be enough in that exact place.'
      ],
      prayer: [
        'Lord Jesus, your grace is sufficient for me, and your strength is made perfect in my weakness.',
        'I bring you the limitation I keep trying to hide.',
        'Let your power rest on me there, instead of my performance.',
        'Be enough for people who are weak and tired of pretending.',
        'I will boast in you and not in my image, in the name of Jesus.'
      ]
    },
    {
      ref: 'Ephesians 2:8',
      study: [
        'By grace you are saved through faith, and that is not from yourselves: it is the gift of God.',
        'The next line of the chapter says this salvation is not by works, so you cannot finish by earning what began as a gift.',
        'Faith receives: it does not negotiate a wage.',
        'Thank him for the gift today, and let gratitude, not fear of losing your place, be the reason you obey.'
      ],
      prayer: [
        'Father, I am saved by grace through faith, and it is your gift.',
        'I stop trying to turn the gift into a wage I can claim.',
        'Deepen my faith, and keep it simple and real.',
        'Let gratitude for grace make me generous and humble.',
        'Thank you for a salvation I did not invent, in the name of Jesus.'
      ]
    },
    {
      ref: 'Philippians 4:6',
      study: [
        'Be careful for nothing means do not be consumed by anxiety, but in everything pray, ask, and give thanks.',
        'The replacement for worry is not denial: it is prayer that tells God the request and still gives thanks.',
        'Everything is allowed in that prayer, including the small irritations and the large fears.',
        'Turn the next worry into a sentence you actually pray, and add one thanks before you move on.'
      ],
      prayer: [
        'Father, I have been careful and anxious about things you already know.',
        'In everything I make my requests known to you, with thanksgiving.',
        'Here is what I need, and here is what I thank you for even now.',
        'Catch the worry when it starts, and turn it into prayer again.',
        'I bring it all to you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Philippians 4:7',
      study: [
        'The peace of God, which passes understanding, will guard your hearts and minds through Christ Jesus.',
        'This peace follows the prayer of the verse before it, and it does not depend on you understanding every outcome.',
        'Guard is a strong word: peace stands watch over the heart and the mind, where anxiety tries to live.',
        'After you pray today, ask this peace to keep watch, and do not reopen the case every ten minutes.'
      ],
      prayer: [
        'Father, let your peace, which passes understanding, guard my heart and my mind.',
        'I do not see how this will work out, and I ask for peace anyway.',
        'Station that peace at the door of my thoughts.',
        'Guard the minds of people who are spiraling and cannot sleep.',
        'I receive your peace through Christ Jesus, in the name of Jesus.'
      ]
    },
    {
      ref: 'Philippians 4:13',
      study: [
        'Paul says he can do all things through Christ who strengthens him, in a passage about having plenty and being in need.',
        'The promise is strength for the situation God gives, including hunger and abundance, not a blank check for every ambition.',
        'Christ strengthens you to be faithful where you are, not to become impressive on command.',
        'Ask for that strength for the actual assignment of today, especially if it is humble or hard.'
      ],
      prayer: [
        'Lord Jesus, strengthen me to do what you have actually given me to do.',
        'I do not ask for power to chase every ambition, but for faithfulness in plenty and in need.',
        'Be my strength in the task I would rather avoid.',
        'Strengthen people who are weak and still trying to obey you.',
        'I can face this through you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Philippians 4:19',
      study: [
        'God will supply all your need according to his riches in glory by Christ Jesus.',
        'Need is not the same as every want, and his supply is measured by his riches, not by your panic.',
        'The supply comes by Christ, so you look to a person and not only to a paycheck.',
        'Name a true need today, ask him for it, and thank him for the supply you have already stopped noticing.'
      ],
      prayer: [
        'Father, supply all my need according to your riches in glory by Christ Jesus.',
        'You know the difference between my needs and my wants better than I do.',
        'Provide for my household, and keep me generous if you give extra.',
        'Supply the need of people who are anxious about money, health, or work.',
        'I look to you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Colossians 3:23',
      study: [
        'Whatever you do, do it heartily, as to the Lord and not to people.',
        'The audience of your work changes the spirit of it: you are serving Christ in the ordinary task.',
        'Heartily means with your real effort, not a performance aimed at whoever is watching.',
        'Take the next piece of work and do it for him, including the part no one will thank you for.'
      ],
      prayer: [
        'Lord, whatever I do today, I want to do it heartily, as to you and not to people.',
        'Free me from working only when I am seen.',
        'Receive the hidden task as worship.',
        'Give dignity to workers who are overlooked and tired.',
        'I offer you this day\'s labor, in the name of Jesus.'
      ]
    },
    {
      ref: '1 Thessalonians 5:18',
      study: [
        'In everything give thanks, for this is the will of God in Christ Jesus for you.',
        'In everything is not the same as for everything: you can thank God in a hard thing without calling the hard thing good.',
        'Thanks is his will, so it is not optional for a mature life, and it is possible because you are in Christ.',
        'Find one true thanks inside the situation you do not like, and say it to God before the complaint gets the whole meeting.'
      ],
      prayer: [
        'Father, your will is that I give thanks in everything.',
        'I will not pretend the painful thing is sweet, but I will thank you in it.',
        'Open my eyes to mercies I have walked past.',
        'Make gratitude a habit in my home, not a speech for good days only.',
        'I give you thanks in this day, in the name of Jesus.'
      ]
    },
    {
      ref: '2 Timothy 1:7',
      study: [
        'God has not given a spirit of fear, but of power, love, and a sound mind.',
        'Fear that shrinks you from faithfulness is not his gift, even when the feeling is strong.',
        'Power, love, and a sound mind belong together: courage without love is harsh, and love without a sound mind is naive.',
        'When fear starts making your decisions, ask for those three, and then do the faithful thing with a clear head.'
      ],
      prayer: [
        'Father, you have not given me a spirit of fear.',
        'Give me power, love, and a sound mind for the thing I am avoiding.',
        'Keep my courage kind, and keep my love clear-headed.',
        'Silence the panic that pretends to be wisdom.',
        'I receive what you give, in the name of Jesus.'
      ]
    },
    {
      ref: 'Hebrews 4:16',
      study: [
        'Come boldly to the throne of grace, so that you may receive mercy and find grace to help in time of need.',
        'Boldly does not mean casually: it means you do not slink away from a throne that is grace.',
        'The help is timed for the need, so you do not have to pretend you are not in one.',
        'Come today with the actual need, and expect mercy rather than a lecture as the first word.'
      ],
      prayer: [
        'Father, I come boldly to the throne of grace, because you invited me.',
        'I need mercy for what I have done, and grace for what I still have to face.',
        'Help me in this time of need, in the way you know is best.',
        'Draw near the person who thinks they are not allowed to approach you.',
        'I come in the name of Jesus.'
      ]
    },
    {
      ref: 'Hebrews 11:1',
      study: [
        'Faith is the substance of things hoped for, and the evidence of things not seen.',
        'It is not a vague wish: it treats God\'s promise as solid before the eyes can confirm it.',
        'You still hope, and you still do not see everything, and faith stands in that gap without calling God a liar.',
        'Act today on one promise you cannot yet see, in a small obedience that would make no sense if he were not trustworthy.'
      ],
      prayer: [
        'Lord, give me faith that is the substance of what I hope for, and the evidence of what I cannot see.',
        'I believe your promises more than I believe my mood.',
        'Hold me steady while the answer is still invisible.',
        'Strengthen the faith of people who are tired of waiting.',
        'I trust what you have said, in the name of Jesus.'
      ]
    },
    {
      ref: 'Hebrews 13:5',
      study: [
        'Keep your life free from the love of money, and be content with what you have, because God has said he will never leave you or forsake you.',
        'In this verse, conversation means your way of life, and the cure for greed is contentment rooted in God\'s presence.',
        'The promise is not a bigger pile: it is a God who stays.',
        'Practice contentment today by thanking him for what you already have, and by refusing one grab for more.'
      ],
      prayer: [
        'Lord, keep my way of life free from the love of money.',
        'Teach me to be content with what I have, because you will never leave me or forsake me.',
        'You are my security, more than the account or the plan.',
        'Free people who are crushed by want or by greed.',
        'I choose contentment because you stay, in the name of Jesus.'
      ]
    },
    {
      ref: 'James 1:5',
      study: [
        'If you lack wisdom, ask God, who gives to all generously and does not scold you for asking, and it will be given.',
        'Wisdom is not only information: it is knowing how to live the next step well.',
        'God is not irritated by the request, so you do not have to apologize for needing help to see clearly.',
        'Ask him for wisdom about one real decision today, and then wait long enough to obey what you already know is right.'
      ],
      prayer: [
        'Father, I lack wisdom, and you told me to ask.',
        'Give generously, and do not let me be afraid that you are tired of my asking.',
        'I need wisdom for the decision, the conversation, and the motive underneath them.',
        'Give clear minds to people who are overwhelmed.',
        'I will ask and I will listen, in the name of Jesus.'
      ]
    },
    {
      ref: 'James 1:22',
      study: [
        'Be doers of the word, and not hearers only, or you deceive yourselves.',
        'Hearing feels like progress, and it can become a way to avoid the step the word just named.',
        'Self-deception is the risk: you can agree with Scripture and still leave it on the page.',
        'Take the last thing God showed you and do one small piece of it today before you go looking for a new insight.'
      ],
      prayer: [
        'Lord, I do not want to hear your word and walk away unchanged.',
        'Save me from the self-deception of agreeing without obeying.',
        'Show me the one thing to do, and give me the will to do it.',
        'Make your people doers, in homes and in hidden places.',
        'I will act on what you have said, in the name of Jesus.'
      ]
    },
    {
      ref: '1 Peter 5:7',
      study: [
        'Cast all your care on him, because he cares for you.',
        'All your care means you do not sort the worries into ones too small or too messy for him.',
        'The reason you can cast them is not that you are strong: it is that he cares.',
        'Hand him the care you keep picking back up, and leave it there long enough to do the next loving thing.'
      ],
      prayer: [
        'Father, I cast all my care on you, because you care for me.',
        'Here are the worries I have been turning over instead of giving up.',
        'You care about what happens to me, and I will trust that care.',
        'Catch the cares of people who think no one is holding them.',
        'I leave this with you, in the name of Jesus.'
      ]
    },
    {
      ref: '1 John 1:9',
      study: [
        'If you confess your sins, God is faithful and just to forgive you and to cleanse you from all unrighteousness.',
        'Confession is specific honesty, not a foggy feeling of being a bad person.',
        'Faithful and just means forgiveness rests on his character and on what Christ has done, not on how crushed you feel.',
        'Name the sin to him today, receive the cleansing, and then walk forward instead of living in the confession forever.'
      ],
      prayer: [
        'Faithful God, I confess my sins to you, and I do not want to hide the details from myself.',
        'You are faithful and just to forgive me and to cleanse me from all unrighteousness.',
        'I receive that forgiveness, and I ask for a clean path forward.',
        'Give me the humility to make a wrong right where I have hurt someone.',
        'Thank you for cleansing me, in the name of Jesus.'
      ]
    },
    {
      ref: '1 John 4:8',
      study: [
        'The person who does not love does not know God, because God is love.',
        'Love is not a side trait he sometimes shows: it is what he is, and it shows up in the people who know him.',
        'This is a searching verse, and it is meant to send you back to God for a love you cannot manufacture.',
        'Ask him to love someone through you today whom you find easy to dismiss.'
      ],
      prayer: [
        'God, you are love, and I want to know you in a way that makes me loving.',
        'Forgive the coldness I have called discernment.',
        'Pour your love through me toward the person I avoid.',
        'Teach your people to look like you in ordinary kindness.',
        'I want to know you, in the name of Jesus.'
      ]
    },
    {
      ref: '1 John 4:19',
      study: [
        'We love him because he first loved us.',
        'Your love for God is a response, not the spark that got his attention.',
        'When your love feels thin, the cure is to look again at his love, not to scold yourself into a feeling.',
        'Remember one way he loved you first, and let thanks become love before the day gets loud.'
      ],
      prayer: [
        'Father, I love you because you first loved me.',
        'When my love is cold, show me your love again.',
        'Let your first love loosen my fear and my pride.',
        'Help me love the people you have already loved.',
        'Thank you for loving me before I ever turned toward you, in the name of Jesus.'
      ]
    },
    {
      ref: 'Revelation 21:4',
      study: [
        'God will wipe away tears, and death, sorrow, crying, and pain will be gone, because the former things have passed away.',
        'This is a future promise, so it does not say the pain is fake now: it says the pain is not final.',
        'The one who wipes the tears is God himself, which is as personal as hope can be.',
        'Let this promise sit beside a present grief today, and comfort someone else with a hope you do not have to invent.'
      ],
      prayer: [
        'Father, I long for the day when you will wipe away every tear.',
        'Death, sorrow, crying, and pain are still here, and I ask you to comfort us while we wait.',
        'Keep me from calling evil good, and keep me from calling the story finished.',
        'Hold the grieving until the former things pass away.',
        'I put my hope in you, in the name of Jesus.'
      ]
    }
  ];

  const STUDIES = DAYS.map(function (d) {
    return { ref: d.ref, message: pack(d.study) };
  });
  const PRAYERS = DAYS.map(function (d) { return pack(d.prayer); });

  function pickIndex(dayNumber, length) {
    const len = length || STUDIES.length;
    const n = Number(dayNumber) || 0;
    return ((n % len) + len) % len;
  }

  function forDate(dayNumber) {
    const index = pickIndex(dayNumber, STUDIES.length);
    return { index: index, study: STUDIES[index], prayer: PRAYERS[index] };
  }

  return { DAYS: DAYS.length, STUDIES: STUDIES, PRAYERS: PRAYERS, pickIndex: pickIndex, forDate: forDate };
});
