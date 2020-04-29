import Calendar = GoogleAppsScript.Calendar.Calendar;
import GmailThread = GoogleAppsScript.Gmail.GmailThread;
import GmailMessage = GoogleAppsScript.Gmail.GmailMessage;

const CALENDAR_NAME = "english_lesson";
const QUERY =
  `newer_than:7d is:unread from:noreply@eikaiwa.dmm.com subject:"レッスン予約"`;

interface ICalendarEvent {
  date: string;
  time: string;
  name: string;
  link: string;
}

function main() {
  const results =
    threads()
      .map(messages)
      .map(calendarEvents)
      .map(register);

  if (results.every(isSucceededAll)) {
    threads()
      .map(read);
  } else {
    Logger.log("カレンダー登録に失敗しました");
  }
}

function threads(): GmailThread[] {
  return GmailApp.search(QUERY);
}

function messages(thread: GmailThread): GmailMessage[] {
  return thread.getMessages();
}

function calendarEvents(gmailMessages: GmailMessage[]): ICalendarEvent[] {
  return gmailMessages.map((message) => {
    const e = {
      date: "",
      name: "",
      time: "",
      link: "",
    };
    const body = message.getBody();
    const match = body.match(/(\d{4})\/(\d{1,2})\/(\d{1,2}) (\d{1,2}):(\d{1,2})の(.+)とのレッスン予約が完了しました。/);
    if (match !== null && match.length === 7) {
      e.name = `DMM英会話 ${match[6]} 先生`;
      e.date = `${match[1]}-${match[2]}-${match[3]}`;
      e.time = `${match[4]}:${match[5]}:00`;
    }
    const linkMatch = body.match(/href="(.*)">レッスンに参加/);
    e.link = `${linkMatch[1]}`;
    Logger.log(`${e.name}, ${e.date}, ${e.time}, ${e.link}`);
    return e;
  });
}

function register(events: ICalendarEvent[]): boolean[] {
  const result =
    calendars()
      .map((calendar) => {
        return events.map((e) => {
          const startTime = new Date(`${e.date}T${e.time}`);
          const endTime = new Date(startTime.getTime());
          endTime.setMinutes(endTime.getMinutes() + 25);

          Logger.log(`${e.name} (${startTime} - ${endTime})`);
          calendar.createEvent(e.name, startTime, endTime, { description: `${e.link}`});
          return true;
        });
      });
  return [].concat.apply([], result);
}

function calendars(): Calendar[] {
  const result = CalendarApp.getCalendarsByName(CALENDAR_NAME);
  if (result.length === 0) {
    result.push(CalendarApp.createCalendar(CALENDAR_NAME));
  }
  return result;
}

function isSucceededAll(results: boolean[]): boolean {
  return results.every((n) => n);
}

function read(thread: GmailThread) {
  thread.markRead();
}
