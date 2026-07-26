export const EN_ONBOARDING_MESSAGES = {
  back: 'Go back',
  continue: 'Continue',
  createAccount: 'Create account',
  saving: 'Saving...',
  optional: '(optional)',
  progressLabel: 'Getting started progress',
  phaseLabels: {
    personalization: 'Personalization',
    registration: 'Registration',
    onboarding: 'Onboarding',
  },
  accountBanner: {
    verifyTitle: 'Verify your email to participate',
    verifyDescription:
      'You can browse the workspace, but actions remain unavailable until your email is verified.',
    verifyAction: 'Verify email',
    rulesTitle: 'Review the community rules',
    rulesDescription:
      'You can browse the workspace, but actions remain unavailable until you accept the rules.',
    rulesAction: 'View rules',
    rulesUpdatedTitle: 'Review the updated community rules',
    rulesUpdatedDescription:
      'The rules have changed. Accept the current version to reactivate participation.',
    tourTitle: 'Finish your platform tour',
    tourDescription:
      'Continue where you left off, or skip the optional tour permanently.',
    tourSkipAction: 'Skip',
    tourExploreAction: 'Explore',
  },
  welcome: {
    title: 'Let’s build\nyour profile',
    description:
      'Answer a few quick questions and we’ll shape the experience around your goals and a pace that feels right.',
    time: 'It takes about 3 minutes',
    cta: 'Get started',
    scienceLabs: {
      label: 'Interactive science laboratories',
      nextLab: 'Next laboratory',
      swipeHint: 'Swipe up for the next laboratory',
      position: '{{current}} of {{total}}',
      wave: {
        eyebrow: 'Wave laboratory',
        title: 'Shape a travelling wave',
        frequency: 'Frequency',
        amplitude: 'Amplitude',
        frequencyUnit: 'Hz',
        amplitudeUnit: '%',
        hint:
          'Frequency changes how closely waves repeat. Amplitude changes their height.',
      },
      chemistry: {
        eyebrow: 'Chemistry laboratory',
        title: 'Balance a pH mixture',
        acid: 'Acid solution',
        base: 'Alkaline solution',
        volumeUnit: 'mL',
        phLabel: 'pH',
        hint:
          'Equal amounts neutralize each other; changing the balance shifts the pH.',
      },
      light: {
        eyebrow: 'Light laboratory',
        title: 'Explore visible light',
        wavelength: 'Wavelength',
        intensity: 'Intensity',
        wavelengthUnit: 'nm',
        intensityUnit: '%',
        hint: 'Wavelength determines the color of visible light.',
      },
    },
  },
  motivation: {
    title: 'What motivates you to learn?',
    description: 'Choose the reason that feels most relevant right now.',
    options: {
      school: 'Do better at school',
      career: 'Build skills for my future',
      curiosity: 'Explore what interests me',
      confidence: 'Feel more confident',
    },
  },
  age: {
    title: 'How old are you?',
    description:
      'We use your age only to set up the right account and safety experience.',
    label: 'Your age',
    placeholder: 'Age',
    guardianNote:
      'A parent or guardian will create and manage the account with their email.',
    selfNote: 'You can create and manage this account yourself.',
  },
  pace: {
    title: 'Choose a pace that feels realistic',
    description: 'We’ll use this to tune your recommendations.',
    options: {
      light: {
        title: 'A light start',
        description: 'A few short activities each week',
      },
      steady: {
        title: 'Build a habit',
        description: 'Regular practice throughout the week',
      },
      ambitious: {
        title: 'Move quickly',
        description: 'A focused plan with frequent practice',
      },
    },
  },
  credentials: {
    title: 'Set up your account',
    selfDescription:
      'Use an email you can access. We’ll send a verification code next.',
    guardianDescription:
      'A parent or guardian should enter the email and password they will use to manage this account.',
    guardianNotice:
      'Because the learner is under 16, a parent or legal guardian must manage the account.',
    firstName: 'Learner’s first name',
    lastName: 'Learner’s last name',
    email: 'Email address',
    guardianEmail: 'Parent or guardian email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    passwordHint:
      'Use 8–72 characters with uppercase, lowercase, a number, and a special character.',
    failed: 'We couldn’t save these details. Please review them and try again.',
  },
  verification: {
    title: 'Check your email',
    description: 'Enter the 6-digit code we sent to:',
    wrongEmail: 'Is this email incorrect?',
    changeEmail: 'Change email',
    doLater: 'Complete later',
    changeDescription:
      'Enter the correct address and your current password. We’ll send a new code.',
    changeSuccess: 'Email updated. A new verification code was sent.',
    cancelChange: 'Cancel',
    sentTo: 'Code sent to',
    codeLabel: 'Verification code',
    missing: 'Didn’t receive it?',
    resend: 'Resend code',
    resendIn: 'Resend in {{seconds}}s',
    sending: 'Sending...',
    verifying: 'Verifying...',
    resent: 'A new verification code was sent.',
    invalid: 'That code didn’t work. Check it and try again.',
    sendFailed: 'We couldn’t send a new code. Please try again shortly.',
    sendReminder:
      'Your details were saved, but the email could not be sent. Use “Resend code” to try again.',
    verifiedTitle: 'Email verified',
    verifiedDescription:
      'This address is already verified. Continue when you are ready.',
    verifiedLabel: 'Verification complete',
  },
  guidelines: {
    title: 'A few guidelines before you begin',
    description:
      'These shared expectations keep learning useful, safe, and respectful.',
    readRequired: 'Read the community rules to continue',
    acceptedLabel: 'Rules read and accepted',
    openRules: 'Read rules',
    reviewRules: 'Review rules',
    doneReviewing: 'Done',
    rulesTitle: 'Community rules',
    rulesDescription:
      'Read these expectations carefully. You can accept them after reaching the end.',
    scrollHint: 'Scroll to the end to enable acceptance.',
    endReached: 'You have reached the end and can now accept the rules.',
    acceptRules: 'I have read and accept',
    closeRules: 'Close',
    defer: 'Not now',
    rules: [
      {
        title: 'Respect every person',
        description:
          'Communicate with patience and kindness. Harassment, humiliation, hate speech, threats, and targeted abuse are not allowed.',
      },
      {
        title: 'Keep the learning space safe',
        description:
          'Do not publish sexual, violent, dangerous, or otherwise age-inappropriate material. Never encourage harmful or illegal activity.',
      },
      {
        title: 'Protect personal information',
        description:
          'Do not share passwords, home addresses, phone numbers, private messages, school schedules, or other sensitive details in public areas.',
      },
      {
        title: 'Learn and contribute honestly',
        description:
          'Submit your own work, credit sources, and give constructive guidance. Do not impersonate others, cheat, spam, or manipulate platform activity.',
      },
      {
        title: 'Use communication tools responsibly',
        description:
          'Keep posts, replies, and sessions relevant to learning. Do not pressure anyone to move conversations to an unsafe or unmoderated channel.',
      },
      {
        title: 'Report concerns instead of escalating them',
        description:
          'Use the reporting tools when something feels unsafe or breaks these rules. Do not retaliate or start a public confrontation.',
      },
      {
        title: 'Follow the platform agreements',
        description:
          'Using oyrenoyret also means following the Terms of Service and Privacy Policy. Serious or repeated violations may restrict or close an account.',
      },
    ],
    accept:
      'I accept the Terms of Service, Privacy Policy, and community guidelines.',
    guardianAccept:
      'I confirm that I am the learner’s parent or legal guardian and consent to creating and managing this account.',
    activating: 'Saving...',
    failed: 'We couldn’t save your acceptance. Please try again.',
  },
  tour: {
    back: 'Go back',
    next: 'Next',
    skip: 'Skip tour',
    saving: 'Saving...',
    saveFailed: 'We couldn’t save your progress. Please try again.',
    feed: {
      title: 'Your feed keeps learning in one place',
      description:
        'Find recommendations, community updates, and useful discussions without losing your place.',
    },
    tracks: {
      title: 'Tracks turn goals into clear next steps',
      description:
        'Follow a guided path, see what is complete, and always know what to learn next.',
    },
    preferences: {
      title: 'Make the workspace feel like yours',
      description:
        'Adjust appearance, language, and time from one consistent settings area.',
    },
    complete: {
      title: 'That’s all — you’re ready',
      description:
        'Your account is set up and your first learning path is waiting.',
      cta: 'Start learning',
    },
  },
} as const;

export const AZ_ONBOARDING_MESSAGES = {
  back: 'Geri qayıt',
  continue: 'Davam et',
  createAccount: 'Hesab yarat',
  saving: 'Yadda saxlanılır...',
  optional: '(istəyə bağlı)',
  progressLabel: 'Başlanğıc mərhələlərinin irəliləyişi',
  phaseLabels: {
    personalization: 'Fərdiləşdirmə',
    registration: 'Qeydiyyat',
    onboarding: 'Platforma ilə tanışlıq',
  },
  accountBanner: {
    verifyTitle: 'İştirak etmək üçün e-poçtunuzu təsdiqləyin',
    verifyDescription:
      'İş sahəsinə baxa bilərsiniz, lakin e-poçt təsdiqlənənədək əməliyyatlar əlçatan deyil.',
    verifyAction: 'E-poçtu təsdiqlə',
    rulesTitle: 'İcma qaydalarını nəzərdən keçirin',
    rulesDescription:
      'İş sahəsinə baxa bilərsiniz, lakin qaydaları qəbul edənədək əməliyyatlar əlçatan deyil.',
    rulesAction: 'Qaydalara bax',
    rulesUpdatedTitle: 'Yenilənmiş icma qaydalarını nəzərdən keçirin',
    rulesUpdatedDescription:
      'Qaydalar dəyişib. İştirakı yenidən aktivləşdirmək üçün cari versiyanı qəbul edin.',
    tourTitle: 'Platform turunu tamamlayın',
    tourDescription:
      'Qaldığınız yerdən davam edin və ya istəyə bağlı turu birdəfəlik keçin.',
    tourSkipAction: 'Keç',
    tourExploreAction: 'Kəşf et',
  },
  welcome: {
    title: 'Gəlin profilinizi\nbirlikdə quraq',
    description:
      'Bir neçə qısa suala cavab verin; təcrübəni məqsədlərinizə və sizə uyğun tempə görə quraq.',
    time: 'Təxminən 3 dəqiqə çəkir',
    cta: 'Başla',
    scienceLabs: {
      label: 'İnteraktiv elm laboratoriyaları',
      nextLab: 'Növbəti laboratoriya',
      swipeHint: 'Növbəti laboratoriya üçün yuxarı sürüşdürün',
      position: '{{current}} / {{total}}',
      wave: {
        eyebrow: 'Dalğa laboratoriyası',
        title: 'Hərəkət edən dalğanı formalaşdırın',
        frequency: 'Tezlik',
        amplitude: 'Amplituda',
        frequencyUnit: 'Hz',
        amplitudeUnit: '%',
        hint:
          'Tezlik dalğaların nə qədər sıx təkrarlandığını, amplituda isə hündürlüyünü dəyişir.',
      },
      chemistry: {
        eyebrow: 'Kimya laboratoriyası',
        title: 'pH qarışığını tarazlayın',
        acid: 'Turşu məhlulu',
        base: 'Qələvi məhlulu',
        volumeUnit: 'mL',
        phLabel: 'pH',
        hint:
          'Bərabər miqdarlar bir-birini neytrallaşdırır; tarazlıq dəyişdikcə pH da dəyişir.',
      },
      light: {
        eyebrow: 'İşıq laboratoriyası',
        title: 'Görünən işığı araşdırın',
        wavelength: 'Dalğa uzunluğu',
        intensity: 'İntensivlik',
        wavelengthUnit: 'nm',
        intensityUnit: '%',
        hint: 'Dalğa uzunluğu görünən işığın rəngini müəyyən edir.',
      },
    },
  },
  motivation: {
    title: 'Sizi öyrənməyə nə həvəsləndirir?',
    description: 'Hazırda sizə ən uyğun olan səbəbi seçin.',
    options: {
      school: 'Məktəbdə daha yaxşı nəticə göstərmək',
      career: 'Gələcəyim üçün bacarıqlar qurmaq',
      curiosity: 'Maraqlandığım mövzuları araşdırmaq',
      confidence: 'Özümə daha çox inanmaq',
    },
  },
  age: {
    title: 'Neçə yaşınız var?',
    description:
      'Yaşınızı yalnız uyğun hesab və təhlükəsizlik təcrübəsini qurmaq üçün istifadə edirik.',
    label: 'Yaşınız',
    placeholder: 'Yaş',
    guardianNote:
      'Valideyn və ya qəyyum hesabı öz e-poçtu ilə yaradıb idarə edəcək.',
    selfNote: 'Bu hesabı özünüz yaradıb idarə edə bilərsiniz.',
  },
  pace: {
    title: 'Sizə uyğun real temp seçin',
    description: 'Tövsiyələrinizi bu seçimə əsasən uyğunlaşdıracağıq.',
    options: {
      light: {
        title: 'Yüngül başlanğıc',
        description: 'Hər həftə bir neçə qısa fəaliyyət',
      },
      steady: {
        title: 'Vərdiş yaradın',
        description: 'Həftə ərzində müntəzəm məşq',
      },
      ambitious: {
        title: 'Sürətli irəliləyin',
        description: 'Tez-tez məşqlə fokuslanmış plan',
      },
    },
  },
  credentials: {
    title: 'Hesab məlumatlarınızı daxil edin',
    selfDescription:
      'Girişiniz olan e-poçtdan istifadə edin. Növbəti addımda təsdiq kodu göndərəcəyik.',
    guardianDescription:
      'Valideyn və ya qəyyum bu hesabı idarə etmək üçün istifadə edəcəyi e-poçt və şifrəni daxil etməlidir.',
    guardianNotice:
      'Öyrənən 16 yaşdan kiçik olduğu üçün hesabı valideyn və ya qanuni qəyyum idarə etməlidir.',
    firstName: 'Öyrənənin adı',
    lastName: 'Öyrənənin soyadı',
    email: 'E-poçt ünvanı',
    guardianEmail: 'Valideyn və ya qəyyum e-poçtu',
    password: 'Şifrə',
    confirmPassword: 'Şifrəni təsdiqlə',
    passwordHint:
      '8–72 simvol, böyük və kiçik hərf, rəqəm və xüsusi simvoldan istifadə edin.',
    failed:
      'Bu məlumatları yadda saxlamaq mümkün olmadı. Yoxlayıb yenidən cəhd edin.',
  },
  verification: {
    title: 'E-poçtunuzu yoxlayın',
    description: 'Bu ünvana göndərdiyimiz 6 rəqəmli kodu daxil edin:',
    wrongEmail: 'E-poçt ünvanı yanlışdır?',
    changeEmail: 'E-poçtu dəyiş',
    doLater: 'Sonra tamamla',
    changeDescription:
      'Düzgün ünvanı və cari şifrənizi daxil edin. Yeni kod göndərəcəyik.',
    changeSuccess: 'E-poçt yeniləndi. Yeni təsdiq kodu göndərildi.',
    cancelChange: 'Ləğv et',
    sentTo: 'Kod bu ünvana göndərildi',
    codeLabel: 'Təsdiq kodu',
    missing: 'Kod gəlmədi?',
    resend: 'Kodu yenidən göndər',
    resendIn: '{{seconds}} san. sonra yenidən göndər',
    sending: 'Göndərilir...',
    verifying: 'Yoxlanılır...',
    resent: 'Yeni təsdiq kodu göndərildi.',
    invalid: 'Kod uyğun gəlmədi. Yoxlayıb yenidən cəhd edin.',
    sendFailed: 'Yeni kodu göndərmək mümkün olmadı. Bir az sonra yenidən cəhd edin.',
    sendReminder:
      'Məlumatlarınız yadda saxlanıldı, lakin e-poçt göndərilmədi. Yenidən cəhd etmək üçün “Kodu yenidən göndər” seçin.',
    verifiedTitle: 'E-poçt təsdiqləndi',
    verifiedDescription:
      'Bu ünvan artıq təsdiqlənib. Hazır olduqda davam edin.',
    verifiedLabel: 'Təsdiqləmə tamamlandı',
  },
  guidelines: {
    title: 'Başlamazdan əvvəl bir neçə qayda',
    description:
      'Bu ortaq gözləntilər öyrənməni faydalı, təhlükəsiz və hörmətli saxlayır.',
    readRequired: 'Davam etmək üçün icma qaydalarını oxuyun',
    acceptedLabel: 'Qaydalar oxundu və qəbul edildi',
    openRules: 'Qaydaları oxu',
    reviewRules: 'Qaydalara yenidən bax',
    doneReviewing: 'Hazırdır',
    rulesTitle: 'İcma qaydaları',
    rulesDescription:
      'Bu gözləntiləri diqqətlə oxuyun. Sona çatdıqdan sonra qaydaları qəbul edə bilərsiniz.',
    scrollHint: 'Qəbul düyməsini aktivləşdirmək üçün sona qədər sürüşdürün.',
    endReached: 'Sona çatdınız və indi qaydaları qəbul edə bilərsiniz.',
    acceptRules: 'Oxudum və qəbul edirəm',
    closeRules: 'Bağla',
    defer: 'İndi deyil',
    rules: [
      {
        title: 'Hər kəsə hörmət edin',
        description:
          'Səbirli və nəzakətli ünsiyyət qurun. Təhqir, alçaltma, nifrət nitqi, təhdid və məqsədli zorakılığa icazə verilmir.',
      },
      {
        title: 'Öyrənmə mühitini təhlükəsiz saxlayın',
        description:
          'Cinsi, zorakı, təhlükəli və ya yaşa uyğun olmayan material paylaşmayın. Zərərli və ya qanunsuz fəaliyyətə təşviq etməyin.',
      },
      {
        title: 'Şəxsi məlumatları qoruyun',
        description:
          'Şifrələri, ev ünvanlarını, telefon nömrələrini, şəxsi mesajları, məktəb cədvəllərini və digər həssas məlumatları açıq sahələrdə paylaşmayın.',
      },
      {
        title: 'Dürüst öyrənin və töhfə verin',
        description:
          'Öz işinizi təqdim edin, mənbələri göstərin və konstruktiv istiqamət verin. Başqasını təqlid etməyin, köçürməyin, spam etməyin və platforma fəaliyyətini manipulyasiya etməyin.',
      },
      {
        title: 'Ünsiyyət alətlərindən məsuliyyətlə istifadə edin',
        description:
          'Paylaşımları, cavabları və sessiyaları öyrənmə mövzusunda saxlayın. Heç kəsi söhbəti təhlükəli və ya nəzarətsiz kanala keçirməyə məcbur etməyin.',
      },
      {
        title: 'Problemi böyütmək əvəzinə bildirin',
        description:
          'Təhlükəli görünən və ya qaydaları pozan hallarda bildirmə alətlərindən istifadə edin. Qarşılıq verməyin və açıq qarşıdurma yaratmayın.',
      },
      {
        title: 'Platforma razılaşmalarına əməl edin',
        description:
          'oyrenoyret-dən istifadə İstifadə Şərtlərinə və Məxfilik Siyasətinə əməl etməyi də nəzərdə tutur. Ciddi və ya təkrarlanan pozuntular hesabı məhdudlaşdıra və ya bağlaya bilər.',
      },
    ],
    accept:
      'İstifadə Şərtlərini, Məxfilik Siyasətini və icma qaydalarını qəbul edirəm.',
    guardianAccept:
      'Öyrənənin valideyni və ya qanuni qəyyumu olduğumu təsdiqləyir, bu hesabın yaradılmasına və idarəsinə razılıq verirəm.',
    activating: 'Yadda saxlanılır...',
    failed: 'Qəbulunuzu yadda saxlamaq mümkün olmadı. Yenidən cəhd edin.',
  },
  tour: {
    back: 'Geri qayıt',
    next: 'Növbəti',
    skip: 'Turu keç',
    saving: 'Yadda saxlanılır...',
    saveFailed: 'İrəliləyişi yadda saxlamaq mümkün olmadı. Yenidən cəhd edin.',
    feed: {
      title: 'Axış öyrənməni bir yerdə saxlayır',
      description:
        'Yeriniz itmədən tövsiyələri, icma yeniliklərini və faydalı müzakirələri tapın.',
    },
    tracks: {
      title: 'Öyrənmə proqramları məqsədləri aydın addımlara çevirir',
      description:
        'Yönləndirilmiş yolu izləyin, tamamlananları görün və növbəti öyrənəcəyinizi həmişə bilin.',
    },
    preferences: {
      title: 'İş sahəsini özünüzə uyğunlaşdırın',
      description:
        'Görünüşü, dili və vaxtı vahid ayarlar bölməsindən dəyişin.',
    },
    complete: {
      title: 'Bu qədər — hazırsınız',
      description:
        'Hesabınız quruldu və ilk öyrənmə proqramınız sizi gözləyir.',
      cta: 'Öyrənməyə başla',
    },
  },
} as const;

export const TR_ONBOARDING_MESSAGES = {
  back: 'Geri dön',
  continue: 'Devam et',
  createAccount: 'Hesap oluştur',
  saving: 'Kaydediliyor...',
  optional: '(isteğe bağlı)',
  progressLabel: 'Başlangıç süreci',
  phaseLabels: {
    personalization: 'Kişiselleştirme',
    registration: 'Kayıt',
    onboarding: 'Platforma tanıtımı',
  },
  accountBanner: {
    verifyTitle: 'Katılmak için e-postanızı doğrulayın',
    verifyDescription:
      'Çalışma alanına göz atabilirsiniz, ancak e-posta doğrulanana kadar işlemler kullanılamaz.',
    verifyAction: 'E-postayı doğrula',
    rulesTitle: 'Topluluk kurallarını inceleyin',
    rulesDescription:
      'Çalışma alanına göz atabilirsiniz, ancak kuralları kabul edene kadar işlemler kullanılamaz.',
    rulesAction: 'Kuralları görüntüle',
    rulesUpdatedTitle: 'Güncellenen topluluk kurallarını inceleyin',
    rulesUpdatedDescription:
      'Kurallar değişti. Katılımı yeniden etkinleştirmek için güncel sürümü kabul edin.',
    tourTitle: 'Platform turunu tamamlayın',
    tourDescription:
      'Kaldığınız yerden devam edin veya isteğe bağlı turu kalıcı olarak atlayın.',
    tourSkipAction: 'Atla',
    tourExploreAction: 'Keşfet',
  },
  welcome: {
    title: 'Profilinizi birlikte\noluşturalım',
    description:
      'Birkaç kısa soruyu yanıtlayın; deneyimi hedeflerinize ve size uygun bir tempoya göre şekillendirelim.',
    time: 'Yaklaşık 3 dakika sürer',
    cta: 'Başlayın',
    scienceLabs: {
      label: 'Etkileşimli bilim laboratuvarları',
      nextLab: 'Sonraki laboratuvar',
      swipeHint: 'Sonraki laboratuvar için yukarı kaydırın',
      position: '{{current}} / {{total}}',
      wave: {
        eyebrow: 'Dalga laboratuvarı',
        title: 'Hareket eden bir dalgayı şekillendirin',
        frequency: 'Frekans',
        amplitude: 'Genlik',
        frequencyUnit: 'Hz',
        amplitudeUnit: '%',
        hint:
          'Frekans dalgaların ne kadar sık tekrarlandığını, genlik ise yüksekliklerini değiştirir.',
      },
      chemistry: {
        eyebrow: 'Kimya laboratuvarı',
        title: 'Bir pH karışımını dengeleyin',
        acid: 'Asit çözeltisi',
        base: 'Baz çözeltisi',
        volumeUnit: 'mL',
        phLabel: 'pH',
        hint:
          'Eşit miktarlar birbirini nötrler; denge değiştikçe pH değeri de değişir.',
      },
      light: {
        eyebrow: 'Işık laboratuvarı',
        title: 'Görünür ışığı keşfedin',
        wavelength: 'Dalga boyu',
        intensity: 'Yoğunluk',
        wavelengthUnit: 'nm',
        intensityUnit: '%',
        hint: 'Dalga boyu, görünür ışığın rengini belirler.',
      },
    },
  },
  motivation: {
    title: 'Sizi öğrenmeye motive eden nedir?',
    description: 'Şu anda size en uygun olan nedeni seçin.',
    options: {
      school: 'Okulda daha başarılı olmak',
      career: 'Geleceğim için beceriler edinmek',
      curiosity: 'İlgi alanlarımı keşfetmek',
      confidence: 'Kendime daha çok güvenmek',
    },
  },
  age: {
    title: 'Kaç yaşındasınız?',
    description:
      'Yaşınızı yalnızca doğru hesap ve güvenlik deneyimini oluşturmak için kullanırız.',
    label: 'Yaşınız',
    placeholder: 'Yaş',
    guardianNote:
      'Bir ebeveyn veya vasi hesabı kendi e-postasıyla oluşturup yönetecek.',
    selfNote: 'Bu hesabı kendiniz oluşturup yönetebilirsiniz.',
  },
  pace: {
    title: 'Gerçekçi hissettiren bir tempo seçin',
    description: 'Önerilerinizi bu seçime göre ayarlayacağız.',
    options: {
      light: {
        title: 'Hafif bir başlangıç',
        description: 'Her hafta birkaç kısa etkinlik',
      },
      steady: {
        title: 'Bir alışkanlık oluşturun',
        description: 'Hafta boyunca düzenli pratik',
      },
      ambitious: {
        title: 'Hızlı ilerleyin',
        description: 'Sık pratik içeren odaklı bir plan',
      },
    },
  },
  credentials: {
    title: 'Hesap bilgilerinizi girin',
    selfDescription:
      'Erişebildiğiniz bir e-posta kullanın. Sonraki adımda doğrulama kodu göndereceğiz.',
    guardianDescription:
      'Bir ebeveyn veya vasi, bu hesabı yönetirken kullanacağı e-posta ve şifreyi girmelidir.',
    guardianNotice:
      'Öğrenci 16 yaşın altında olduğu için hesabı bir ebeveyn veya yasal vasi yönetmelidir.',
    firstName: 'Öğrencinin adı',
    lastName: 'Öğrencinin soyadı',
    email: 'E-posta adresi',
    guardianEmail: 'Ebeveyn veya vasi e-postası',
    password: 'Şifre',
    confirmPassword: 'Şifreyi doğrulayın',
    passwordHint:
      'Büyük ve küçük harf, sayı ve özel karakter içeren 8–72 karakter kullanın.',
    failed:
      'Bu bilgileri kaydedemedik. Kontrol edip tekrar deneyin.',
  },
  verification: {
    title: 'E-postanızı kontrol edin',
    description: 'Bu adrese gönderdiğimiz 6 haneli kodu girin:',
    wrongEmail: 'E-posta adresi yanlış mı?',
    changeEmail: 'E-postayı değiştir',
    doLater: 'Daha sonra tamamla',
    changeDescription:
      'Doğru adresi ve mevcut şifrenizi girin. Yeni bir kod göndereceğiz.',
    changeSuccess: 'E-posta güncellendi. Yeni doğrulama kodu gönderildi.',
    cancelChange: 'İptal',
    sentTo: 'Kodun gönderildiği adres',
    codeLabel: 'Doğrulama kodu',
    missing: 'Kod gelmedi mi?',
    resend: 'Kodu tekrar gönder',
    resendIn: '{{seconds}} sn. sonra tekrar gönder',
    sending: 'Gönderiliyor...',
    verifying: 'Doğrulanıyor...',
    resent: 'Yeni bir doğrulama kodu gönderildi.',
    invalid: 'Bu kod çalışmadı. Kontrol edip tekrar deneyin.',
    sendFailed: 'Yeni kodu gönderemedik. Lütfen biraz sonra tekrar deneyin.',
    sendReminder:
      'Bilgileriniz kaydedildi ancak e-posta gönderilemedi. Yeniden denemek için “Kodu tekrar gönder” seçeneğini kullanın.',
    verifiedTitle: 'E-posta doğrulandı',
    verifiedDescription:
      'Bu adres zaten doğrulandı. Hazır olduğunuzda devam edin.',
    verifiedLabel: 'Doğrulama tamamlandı',
  },
  guidelines: {
    title: 'Başlamadan önce birkaç kural',
    description:
      'Bu ortak beklentiler öğrenmeyi yararlı, güvenli ve saygılı tutar.',
    readRequired: 'Devam etmek için topluluk kurallarını okuyun',
    acceptedLabel: 'Kurallar okundu ve kabul edildi',
    openRules: 'Kuralları oku',
    reviewRules: 'Kuralları gözden geçir',
    doneReviewing: 'Bitti',
    rulesTitle: 'Topluluk kuralları',
    rulesDescription:
      'Bu beklentileri dikkatle okuyun. Sona ulaştıktan sonra kuralları kabul edebilirsiniz.',
    scrollHint: 'Kabul düğmesini etkinleştirmek için sona kadar kaydırın.',
    endReached: 'Sona ulaştınız; artık kuralları kabul edebilirsiniz.',
    acceptRules: 'Okudum ve kabul ediyorum',
    closeRules: 'Kapat',
    defer: 'Şimdi değil',
    rules: [
      {
        title: 'Herkese saygı gösterin',
        description:
          'Sabırlı ve nazik iletişim kurun. Taciz, aşağılama, nefret söylemi, tehdit ve hedefli kötüye kullanıma izin verilmez.',
      },
      {
        title: 'Öğrenme alanını güvenli tutun',
        description:
          'Cinsel, şiddet içeren, tehlikeli veya yaşa uygun olmayan materyaller paylaşmayın. Zararlı ya da yasa dışı faaliyetleri teşvik etmeyin.',
      },
      {
        title: 'Kişisel bilgileri koruyun',
        description:
          'Şifreleri, ev adreslerini, telefon numaralarını, özel mesajları, okul programlarını veya diğer hassas bilgileri herkese açık alanlarda paylaşmayın.',
      },
      {
        title: 'Dürüstçe öğrenin ve katkıda bulunun',
        description:
          'Kendi çalışmanızı sunun, kaynakları belirtin ve yapıcı rehberlik sağlayın. Başkalarını taklit etmeyin, kopya çekmeyin, spam yapmayın veya platform etkinliğini manipüle etmeyin.',
      },
      {
        title: 'İletişim araçlarını sorumlu kullanın',
        description:
          'Gönderileri, yanıtları ve oturumları öğrenmeyle ilgili tutun. Kimseyi konuşmayı güvensiz veya denetlenmeyen bir kanala taşımaya zorlamayın.',
      },
      {
        title: 'Sorunları büyütmek yerine bildirin',
        description:
          'Güvensiz görünen veya kuralları ihlal eden durumlarda bildirme araçlarını kullanın. Misilleme yapmayın veya herkese açık bir çatışma başlatmayın.',
      },
      {
        title: 'Platform sözleşmelerine uyun',
        description:
          'oyrenoyret’i kullanmak Hizmet Şartlarına ve Gizlilik Politikasına uymayı da gerektirir. Ciddi veya tekrarlanan ihlaller hesabı kısıtlayabilir ya da kapatabilir.',
      },
    ],
    accept:
      'Hizmet Şartlarını, Gizlilik Politikasını ve topluluk kurallarını kabul ediyorum.',
    guardianAccept:
      'Öğrencinin ebeveyni veya yasal vasisi olduğumu doğruluyor, bu hesabın oluşturulmasına ve yönetilmesine izin veriyorum.',
    activating: 'Kaydediliyor...',
    failed: 'Kabulünüzü kaydedemedik. Lütfen tekrar deneyin.',
  },
  tour: {
    back: 'Geri dön',
    next: 'İleri',
    skip: 'Turu atla',
    saving: 'Kaydediliyor...',
    saveFailed: 'İlerlemenizi kaydedemedik. Lütfen tekrar deneyin.',
    feed: {
      title: 'Akışınız öğrenmeyi tek yerde tutar',
      description:
        'Yerinizi kaybetmeden önerileri, topluluk güncellemelerini ve yararlı tartışmaları bulun.',
    },
    tracks: {
      title: 'Öğrenme yolları hedefleri net adımlara dönüştürür',
      description:
        'Rehberli bir yolu izleyin, tamamlananları görün ve sırada ne öğreneceğinizi her zaman bilin.',
    },
    preferences: {
      title: 'Çalışma alanını kendinize göre ayarlayın',
      description:
        'Görünüm, dil ve saati tek ve tutarlı bir ayarlar alanından yönetin.',
    },
    complete: {
      title: 'Hepsi bu — hazırsınız',
      description:
        'Hesabınız kuruldu ve ilk öğrenme yolunuz sizi bekliyor.',
      cta: 'Öğrenmeye başla',
    },
  },
} as const;

export const RU_ONBOARDING_MESSAGES = {
  back: 'Назад',
  continue: 'Продолжить',
  createAccount: 'Создать аккаунт',
  saving: 'Сохранение...',
  optional: '(необязательно)',
  progressLabel: 'Прогресс начала работы',
  phaseLabels: {
    personalization: 'Персонализация',
    registration: 'Регистрация',
    onboarding: 'Знакомство с платформой',
  },
  accountBanner: {
    verifyTitle: 'Подтвердите почту, чтобы участвовать',
    verifyDescription:
      'Вы можете просматривать рабочее пространство, но действия недоступны до подтверждения почты.',
    verifyAction: 'Подтвердить почту',
    rulesTitle: 'Ознакомьтесь с правилами сообщества',
    rulesDescription:
      'Вы можете просматривать рабочее пространство, но действия недоступны до принятия правил.',
    rulesAction: 'Посмотреть правила',
    rulesUpdatedTitle: 'Ознакомьтесь с обновлёнными правилами',
    rulesUpdatedDescription:
      'Правила изменились. Примите текущую версию, чтобы снова участвовать.',
    tourTitle: 'Завершите обзор платформы',
    tourDescription:
      'Продолжите с места остановки или навсегда пропустите необязательный обзор.',
    tourSkipAction: 'Пропустить',
    tourExploreAction: 'Продолжить обзор',
  },
  welcome: {
    title: 'Давайте создадим\nваш профиль',
    description:
      'Ответьте на несколько коротких вопросов, и мы настроим обучение под ваши цели и комфортный темп.',
    time: 'Это займёт около 3 минут',
    cta: 'Начать',
    scienceLabs: {
      label: 'Интерактивные научные лаборатории',
      nextLab: 'Следующая лаборатория',
      swipeHint: 'Проведите вверх, чтобы открыть следующую лабораторию',
      position: '{{current}} из {{total}}',
      wave: {
        eyebrow: 'Волновая лаборатория',
        title: 'Создайте движущуюся волну',
        frequency: 'Частота',
        amplitude: 'Амплитуда',
        frequencyUnit: 'Гц',
        amplitudeUnit: '%',
        hint:
          'Частота меняет плотность повторений волны, а амплитуда — её высоту.',
      },
      chemistry: {
        eyebrow: 'Лаборатория химии',
        title: 'Сбалансируйте pH смеси',
        acid: 'Кислый раствор',
        base: 'Щелочной раствор',
        volumeUnit: 'мл',
        phLabel: 'pH',
        hint:
          'Равные объёмы нейтрализуют друг друга; изменение баланса меняет pH.',
      },
      light: {
        eyebrow: 'Лаборатория света',
        title: 'Исследуйте видимый свет',
        wavelength: 'Длина волны',
        intensity: 'Интенсивность',
        wavelengthUnit: 'нм',
        intensityUnit: '%',
        hint: 'Длина волны определяет цвет видимого света.',
      },
    },
  },
  motivation: {
    title: 'Что мотивирует вас учиться?',
    description: 'Выберите наиболее подходящую сейчас причину.',
    options: {
      school: 'Лучше учиться в школе',
      career: 'Развивать навыки для будущего',
      curiosity: 'Изучать то, что мне интересно',
      confidence: 'Стать увереннее',
    },
  },
  age: {
    title: 'Сколько вам лет?',
    description:
      'Мы используем возраст только для настройки подходящего аккаунта и уровня безопасности.',
    label: 'Ваш возраст',
    placeholder: 'Возраст',
    guardianNote:
      'Родитель или опекун создаст аккаунт со своей электронной почтой и будет управлять им.',
    selfNote: 'Вы можете создать этот аккаунт и управлять им самостоятельно.',
  },
  pace: {
    title: 'Выберите реалистичный темп',
    description: 'Мы настроим рекомендации с учётом этого выбора.',
    options: {
      light: {
        title: 'Лёгкий старт',
        description: 'Несколько коротких занятий в неделю',
      },
      steady: {
        title: 'Сформировать привычку',
        description: 'Регулярная практика в течение недели',
      },
      ambitious: {
        title: 'Двигаться быстрее',
        description: 'Сфокусированный план с частой практикой',
      },
    },
  },
  credentials: {
    title: 'Введите данные аккаунта',
    selfDescription:
      'Используйте доступную вам электронную почту. На следующем шаге мы отправим код.',
    guardianDescription:
      'Родитель или опекун должен ввести электронную почту и пароль, которые будут использоваться для управления аккаунтом.',
    guardianNotice:
      'Поскольку ученику меньше 16 лет, аккаунтом должен управлять родитель или законный опекун.',
    firstName: 'Имя ученика',
    lastName: 'Фамилия ученика',
    email: 'Адрес электронной почты',
    guardianEmail: 'Электронная почта родителя или опекуна',
    password: 'Пароль',
    confirmPassword: 'Подтвердите пароль',
    passwordHint:
      'Используйте 8–72 символа, включая прописные и строчные буквы, цифру и специальный символ.',
    failed:
      'Не удалось сохранить данные. Проверьте их и попробуйте снова.',
  },
  verification: {
    title: 'Проверьте почту',
    description: 'Введите шестизначный код, отправленный на адрес:',
    wrongEmail: 'Адрес указан неверно?',
    changeEmail: 'Изменить адрес',
    doLater: 'Завершить позже',
    changeDescription:
      'Введите правильный адрес и текущий пароль. Мы отправим новый код.',
    changeSuccess: 'Адрес обновлён. Новый код подтверждения отправлен.',
    cancelChange: 'Отмена',
    sentTo: 'Код отправлен на адрес',
    codeLabel: 'Код подтверждения',
    missing: 'Не получили код?',
    resend: 'Отправить код снова',
    resendIn: 'Повторно через {{seconds}} с',
    sending: 'Отправка...',
    verifying: 'Проверка...',
    resent: 'Новый код подтверждения отправлен.',
    invalid: 'Код не подошёл. Проверьте его и попробуйте снова.',
    sendFailed: 'Не удалось отправить новый код. Повторите попытку чуть позже.',
    sendReminder:
      'Данные сохранены, но письмо не отправилось. Выберите «Отправить код снова», чтобы повторить попытку.',
    verifiedTitle: 'Электронная почта подтверждена',
    verifiedDescription:
      'Этот адрес уже подтверждён. Продолжайте, когда будете готовы.',
    verifiedLabel: 'Подтверждение завершено',
  },
  guidelines: {
    title: 'Несколько правил перед началом',
    description:
      'Эти общие правила делают обучение полезным, безопасным и уважительным.',
    readRequired: 'Прочитайте правила сообщества, чтобы продолжить',
    acceptedLabel: 'Правила прочитаны и приняты',
    openRules: 'Прочитать правила',
    reviewRules: 'Просмотреть правила',
    doneReviewing: 'Готово',
    rulesTitle: 'Правила сообщества',
    rulesDescription:
      'Внимательно прочитайте эти требования. Принять правила можно после того, как вы дойдёте до конца.',
    scrollHint: 'Прокрутите до конца, чтобы активировать кнопку принятия.',
    endReached: 'Вы дошли до конца и теперь можете принять правила.',
    acceptRules: 'Я прочитал(а) и принимаю',
    closeRules: 'Закрыть',
    defer: 'Не сейчас',
    rules: [
      {
        title: 'Уважайте каждого человека',
        description:
          'Общайтесь терпеливо и доброжелательно. Оскорбления, унижение, язык ненависти, угрозы и целенаправленная травля запрещены.',
      },
      {
        title: 'Сохраняйте учебное пространство безопасным',
        description:
          'Не публикуйте сексуальные, жестокие, опасные или не соответствующие возрасту материалы. Не поощряйте вредную или незаконную деятельность.',
      },
      {
        title: 'Защищайте личную информацию',
        description:
          'Не публикуйте пароли, домашние адреса, номера телефонов, личные сообщения, школьное расписание и другие конфиденциальные сведения.',
      },
      {
        title: 'Учитесь и помогайте честно',
        description:
          'Представляйте собственную работу, указывайте источники и давайте конструктивные советы. Не выдавайте себя за других, не списывайте, не рассылайте спам и не манипулируйте активностью.',
      },
      {
        title: 'Ответственно используйте средства общения',
        description:
          'Публикации, ответы и занятия должны быть связаны с обучением. Не принуждайте других переносить разговор в небезопасные или немодерируемые каналы.',
      },
      {
        title: 'Сообщайте о проблемах, а не усугубляйте их',
        description:
          'Используйте инструменты жалоб, если что-то кажется небезопасным или нарушает правила. Не мстите и не начинайте публичный конфликт.',
      },
      {
        title: 'Соблюдайте соглашения платформы',
        description:
          'Использование oyrenoyret также означает соблюдение Условий использования и Политики конфиденциальности. Серьёзные или повторные нарушения могут привести к ограничению или закрытию аккаунта.',
      },
    ],
    accept:
      'Я принимаю Условия использования, Политику конфиденциальности и правила сообщества.',
    guardianAccept:
      'Я подтверждаю, что являюсь родителем или законным опекуном ученика, и разрешаю создать этот аккаунт и управлять им.',
    activating: 'Сохранение...',
    failed: 'Не удалось сохранить ваше согласие. Попробуйте снова.',
  },
  tour: {
    back: 'Назад',
    next: 'Далее',
    skip: 'Пропустить обзор',
    saving: 'Сохранение...',
    saveFailed: 'Не удалось сохранить прогресс. Попробуйте снова.',
    feed: {
      title: 'Лента собирает обучение в одном месте',
      description:
        'Находите рекомендации, новости сообщества и полезные обсуждения, не теряя своего места.',
    },
    tracks: {
      title: 'Учебные пути превращают цели в понятные шаги',
      description:
        'Следуйте маршруту, отмечайте завершённое и всегда знайте, что изучать дальше.',
    },
    preferences: {
      title: 'Настройте рабочее пространство под себя',
      description:
        'Управляйте оформлением, языком и временем в едином разделе настроек.',
    },
    complete: {
      title: 'Вот и всё — вы готовы',
      description:
        'Аккаунт настроен, и ваш первый учебный путь уже ждёт.',
      cta: 'Начать обучение',
    },
  },
} as const;
