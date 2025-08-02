const maxRetries = 3;
let apikey = '';
let greentext = true;

const checkBans = () => {
  const friendEls = document.querySelectorAll('.friends_content .persona');
  const uniquePlayers = [
    ...new Set(Array.from(friendEls, persona => persona.dataset.steamid))
  ];
  const batches = uniquePlayers.reduce((arr, player, i) => {
    const idx = Math.floor(i / 100);
    (arr[idx] ||= []).push(player);
    return arr;
  }, []);

  const doPlayer = player => {
    const playerEls = document.querySelectorAll(
      `.friends_content .persona[data-steamid="${player.SteamId}"]`
    );
    playerEls.forEach(playerEl => {
      if (player.NumberOfVACBans > 0 || player.NumberOfGameBans > 0) {
        const verdictEl = document.createElement('div');
        verdictEl.className = 'banchecker-verdict';
        let verdict =
          (player.NumberOfVACBans > 0 ? `${player.NumberOfVACBans} VAC` : '') +
          (player.NumberOfVACBans > 0 && player.NumberOfGameBans > 0
            ? ' & '
            : '') +
          (player.NumberOfGameBans > 0
            ? `${player.NumberOfGameBans} Game`
            : '') +
          ` ban${
            player.NumberOfVACBans + player.NumberOfGameBans > 1 ? 's' : ''
          } on record\n` +
          (player.DaysSinceLastBan !== undefined &&
          player.DaysSinceLastBan !== null
            ? `Last ban occured ${player.DaysSinceLastBan} day${
                player.DaysSinceLastBan !== 1 ? 's' : ''
              } ago`
            : '');

        const verdictElText = document.createElement('span');
        verdictElText.innerHTML = verdict.replace(/\n/g, '<br>');
        verdictEl.appendChild(verdictElText);

        const nameBlock = playerEl.querySelector('.friend_block_content');
        if (nameBlock) {
          nameBlock.querySelector('.banchecker-verdict')?.remove();
          nameBlock.querySelector('.friend_last_online_text')?.remove();
          nameBlock.querySelector('.friend_small_text')?.remove();
          nameBlock.appendChild(verdictEl);
        }
      }
    });
  };

  const fetchBatch = (i, retryCount) => {
    chrome.runtime.sendMessage(
      chrome.runtime.id,
      {
        action: 'fetchBans',
        apikey,
        batch: batches[i]
      },
      (data, error) => {
        if (error !== undefined) {
          console.log(
            `Error while scanning players for bans:\n${error}` +
              (retryCount > 0
                ? `\n\nRetrying to scan... ${
                    maxRetries - retryCount
                  }/${maxRetries}`
                : `\n\nCouldn't scan for bans after ${maxRetries} retries :(`)
          );
          if (retryCount > 0)
            setTimeout(() => fetchBatch(i, retryCount - 1), 3000);
          return;
        }
        data.json.players.forEach(player => doPlayer(player));
        if (batches.length > i + 1) {
          setTimeout(() => fetchBatch(i + 1, maxRetries), 1000);
        } else {
          console.log("Looks like we're done.");
        }
      }
    );
  };
  fetchBatch(0, maxRetries);
};

const defaultkeys = [
  '5DA40A4A4699DEE30C1C9A7BCE84C914',
  '5970533AA2A0651E9105E706D0F8EDDC',
  '2B3382EBA9E8C1B58054BD5C5EE1C36A'
];

chrome.storage.sync.get(['customapikey', 'greentext'], data => {
  if (typeof data.greentext === 'undefined') {
    chrome.storage.sync.set({ greentext: true });
  } else {
    greentext = data.greentext;
  }
  apikey =
    typeof data.customapikey === 'undefined'
      ? defaultkeys[Math.floor(Math.random() * defaultkeys.length)]
      : data.customapikey;
  checkBans();
});

const container = document.querySelector('.friends_content');
const observer = new MutationObserver(mutationsList => {
  for (let mutation of mutationsList) {
    if (!mutation.target.classList.contains('loading')) checkBans();
  }
});
observer.observe(container, { attributes: true });
